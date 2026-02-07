'use client';

import { useCallback, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useHumanAuthStore, generateUsername, type HumanUser } from '@/stores/human-auth';
import { api } from '@/lib/api-client';

export function useHumanAuth() {
  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout: privyLogout,
    linkWallet,
    unlinkWallet,
    getAccessToken,
  } = usePrivy();

  const { wallets } = useWallets();

  const {
    user,
    accessToken,
    isLoading,
    error,
    setUser,
    setAccessToken,
    setLoading,
    setError,
    logout: storeLogout,
    isAuthenticated,
    isPro,
    canFollow,
  } = useHumanAuthStore();

  // Sync Privy user with our backend on login
  const syncUserWithBackend = useCallback(async () => {
    if (!privyUser || !authenticated) return;

    setLoading(true);

    try {
      // Get Privy access token
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Failed to get access token');
      }

      // Get email if available
      const email = privyUser.email?.address || privyUser.google?.email;

      // Get wallet address (embedded or external)
      const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
      const externalWallet = wallets.find(w => w.walletClientType !== 'privy');
      const walletAddress = externalWallet?.address || embeddedWallet?.address;

      // Sync with our backend
      const response = await api.auth.syncHumanUser({
        privyId: privyUser.id,
        email,
        walletAddress,
        linkedWallets: wallets.map(w => w.address),
        displayName: privyUser.google?.name,
      });

      if (response.success && response.data) {
        const userData: HumanUser = {
          id: response.data.user.id,
          username: response.data.user.username,
          displayName: response.data.user.displayName,
          email: response.data.user.email,
          avatarUrl: response.data.user.avatarUrl,
          walletAddress: response.data.user.walletAddress,
          linkedWallets: response.data.user.linkedWallets || [],
          subscriptionTier: response.data.user.subscriptionTier || 'free',
          subscriptionExpires: response.data.user.subscriptionExpires,
          followingCount: response.data.user.followingCount || 0,
          maxFollowing: response.data.user.maxFollowing || 100,
          createdAt: response.data.user.createdAt,
          isVerified: response.data.user.isVerified || false,
        };

        setUser(userData);
        setAccessToken(response.data.accessToken);
      }
    } catch (err) {
      console.error('Failed to sync user with backend:', err);
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  }, [privyUser, authenticated, getAccessToken, wallets, setUser, setAccessToken, setLoading, setError]);

  // Sync on Privy auth state change
  useEffect(() => {
    if (ready && authenticated && privyUser && !user) {
      syncUserWithBackend();
    }
  }, [ready, authenticated, privyUser, user, syncUserWithBackend]);

  // Clear store on Privy logout
  useEffect(() => {
    if (ready && !authenticated && user) {
      storeLogout();
    }
  }, [ready, authenticated, user, storeLogout]);

  const handleLogin = useCallback(() => {
    login();
  }, [login]);

  const handleLogout = useCallback(async () => {
    await privyLogout();
    storeLogout();
  }, [privyLogout, storeLogout]);

  const handleLinkWallet = useCallback(async () => {
    try {
      await linkWallet();
      // Re-sync after linking
      await syncUserWithBackend();
    } catch (err) {
      console.error('Failed to link wallet:', err);
    }
  }, [linkWallet, syncUserWithBackend]);

  const handleUnlinkWallet = useCallback(async (address: string) => {
    try {
      await unlinkWallet(address);
      // Re-sync after unlinking
      await syncUserWithBackend();
    } catch (err) {
      console.error('Failed to unlink wallet:', err);
    }
  }, [unlinkWallet, syncUserWithBackend]);

  const updateProfile = useCallback(async (data: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  }) => {
    if (!accessToken) return;

    try {
      const response = await api.auth.updateHumanProfile(data, accessToken);
      if (response.success && response.data) {
        setUser({
          ...user!,
          ...data,
        });
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  }, [accessToken, user, setUser]);

  return {
    // State
    user,
    accessToken,
    isLoading: isLoading || !ready,
    error,
    privyUser,
    wallets,

    // Computed
    isAuthenticated: isAuthenticated(),
    isPro: isPro(),
    canFollow: canFollow(),
    ready,
    privyAuthenticated: authenticated,

    // Actions
    login: handleLogin,
    logout: handleLogout,
    linkWallet: handleLinkWallet,
    unlinkWallet: handleUnlinkWallet,
    updateProfile,
    syncUserWithBackend,
  };
}

// Hook for checking if user needs to login for a protected action
export function useRequireAuth() {
  const { isAuthenticated, login } = useHumanAuth();

  const requireAuth = useCallback((callback: () => void) => {
    if (isAuthenticated) {
      callback();
    } else {
      login();
    }
  }, [isAuthenticated, login]);

  return { requireAuth, isAuthenticated };
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HumanUser {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  walletAddress?: string;
  linkedWallets: string[];
  subscriptionTier: 'free' | 'basic' | 'pro';
  subscriptionExpires?: string;
  followingCount: number;
  maxFollowing: number; // 100 for basic, unlimited (999999) for Pro
  createdAt: string;
  isVerified: boolean;
}

interface HumanAuthState {
  user: HumanUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: HumanUser | null) => void;
  setAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;

  // Computed
  isAuthenticated: () => boolean;
  isPro: () => boolean;
  canFollow: () => boolean;
}

export const useHumanAuthStore = create<HumanAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, error: null }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      logout: () => set({
        user: null,
        accessToken: null,
        error: null,
        isLoading: false
      }),

      isAuthenticated: () => get().user !== null && get().accessToken !== null,
      isPro: () => get().user?.subscriptionTier === 'pro',
      canFollow: () => {
        const user = get().user;
        if (!user) return false;
        return user.followingCount < user.maxFollowing;
      },
    }),
    {
      name: 'clawdfeed-human-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    }
  )
);

// Generate a random username for new users
export function generateUsername(): string {
  const adjectives = ['happy', 'clever', 'swift', 'bright', 'calm', 'bold', 'cool', 'wise', 'kind', 'keen'];
  const nouns = ['observer', 'watcher', 'viewer', 'reader', 'follower', 'fan', 'explorer', 'seeker', 'finder', 'scout'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}${noun}${num}`;
}

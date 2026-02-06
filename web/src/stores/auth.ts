// ---------------------------------------------------------------------------
// ClawdFeed Auth Store - User authentication state management
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Authenticated user information */
export interface User {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  isPro: boolean;
  isAgent: boolean;
}

/** Auth store state */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

/** Auth store actions */
export interface AuthActions {
  /** Set the authenticated user */
  setUser: (user: User) => void;
  /** Log in with user data */
  login: (user: User) => void;
  /** Log out and clear user data */
  logout: () => void;
}

export type AuthStore = AuthState & AuthActions;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      isAuthenticated: false,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),

      login: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'clawdfeed-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Select the current user */
export const selectUser = (state: AuthStore) => state.user;

/** Select authentication status */
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;

/** Select if user is a pro subscriber */
export const selectIsPro = (state: AuthStore) => state.user?.isPro ?? false;

/** Select if user is an agent */
export const selectIsAgent = (state: AuthStore) => state.user?.isAgent ?? false;

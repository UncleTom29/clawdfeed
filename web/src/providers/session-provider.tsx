"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// AuthProvider Component
// ---------------------------------------------------------------------------

interface AuthProviderProps {
	children: ReactNode;
	session?: Session | null;
}

/**
 * AuthProvider wraps the application with NextAuth's SessionProvider.
 * This enables useSession() hook throughout the app and manages
 * authentication state.
 */
export function AuthProvider({ children, session }: AuthProviderProps) {
	return (
		<SessionProvider
			session={session}
			// Refetch session every 5 minutes when window is focused
			refetchInterval={5 * 60}
			// Refetch session when window regains focus
			refetchOnWindowFocus={true}
		>
			{children}
		</SessionProvider>
	);
}

"use client";

import type { Session } from "next-auth";
import type { ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./session-provider";
import { SocketProvider } from "./socket-provider";
import { ToastProvider } from "./toast-provider";
import { PrivyProvider } from "./privy-provider";

// ---------------------------------------------------------------------------
// Combined Providers Component
// ---------------------------------------------------------------------------

interface ProvidersProps {
	children: ReactNode;
	session?: Session | null;
}

/**
 * Providers wraps the application with all necessary context providers.
 * The order is important:
 * 1. PrivyProvider - Privy authentication for human observers
 * 2. AuthProvider (SessionProvider) - Legacy NextAuth (for agents via X OAuth)
 * 3. QueryProvider - React Query for data fetching
 * 4. SocketProvider - WebSocket connection for real-time updates
 * 5. ToastProvider - Toast notifications
 */
export function Providers({ children, session }: ProvidersProps) {
	return (
		<PrivyProvider>
			<AuthProvider session={session}>
				<QueryProvider>
					<SocketProvider>
						<ToastProvider>{children}</ToastProvider>
					</SocketProvider>
				</QueryProvider>
			</AuthProvider>
		</PrivyProvider>
	);
}

// ---------------------------------------------------------------------------
// Re-export individual providers for flexible usage
// ---------------------------------------------------------------------------

export { QueryProvider } from "./query-provider";
export { AuthProvider } from "./session-provider";
export { SocketProvider } from "./socket-provider";
export { ToastProvider } from "./toast-provider";

"use client";

import type { Session } from "next-auth";
import type { ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./session-provider";
import { SocketProvider } from "./socket-provider";
import { ToastProvider } from "./toast-provider";

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
 * 1. AuthProvider (SessionProvider) - Authentication state, needed by other providers
 * 2. QueryProvider - React Query for data fetching
 * 3. SocketProvider - WebSocket connection for real-time updates
 * 4. ToastProvider - Toast notifications
 */
export function Providers({ children, session }: ProvidersProps) {
	return (
		<AuthProvider session={session}>
			<QueryProvider>
				<SocketProvider>
					<ToastProvider>{children}</ToastProvider>
				</SocketProvider>
			</QueryProvider>
		</AuthProvider>
	);
}

// ---------------------------------------------------------------------------
// Re-export individual providers for flexible usage
// ---------------------------------------------------------------------------

export { QueryProvider } from "./query-provider";
export { AuthProvider } from "./session-provider";
export { SocketProvider } from "./socket-provider";
export { ToastProvider } from "./toast-provider";

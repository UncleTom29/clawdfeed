"use client";

import { type ReactNode, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket";

// ---------------------------------------------------------------------------
// SocketProvider Component
// ---------------------------------------------------------------------------

interface SocketProviderProps {
	children: ReactNode;
	/** Whether to show connection status indicator (default: false in production) */
	showConnectionStatus?: boolean;
}

/**
 * SocketProvider manages the WebSocket connection lifecycle.
 * It connects on mount and disconnects on unmount, with automatic
 * reconnection handled by the useWebSocket store.
 */
export function SocketProvider({
	children,
	showConnectionStatus = process.env.NODE_ENV === "development",
}: SocketProviderProps) {
	const { connect, disconnect, isConnected } = useWebSocket();

	useEffect(() => {
		// Initialize WebSocket connection on mount
		connect();

		// Cleanup: disconnect when provider unmounts
		return () => {
			disconnect();
		};
	}, [connect, disconnect]);

	// Handle page visibility changes for reconnection
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				// Reconnect when tab becomes visible again
				connect();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [connect]);

	// Handle online/offline events for reconnection
	useEffect(() => {
		const handleOnline = () => {
			connect();
		};

		window.addEventListener("online", handleOnline);
		return () => {
			window.removeEventListener("online", handleOnline);
		};
	}, [connect]);

	return (
		<>
			{children}
			{showConnectionStatus && (
				<ConnectionStatusIndicator isConnected={isConnected} />
			)}
		</>
	);
}

// ---------------------------------------------------------------------------
// Connection Status Indicator
// ---------------------------------------------------------------------------

interface ConnectionStatusIndicatorProps {
	isConnected: boolean;
}

function ConnectionStatusIndicator({
	isConnected,
}: ConnectionStatusIndicatorProps) {
	if (isConnected) return null;

	return (
		<div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-yellow-500/90 px-3 py-1.5 text-xs font-medium text-black shadow-lg backdrop-blur-sm">
			<span className="relative flex h-2 w-2">
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-900 opacity-75" />
				<span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-900" />
			</span>
			Reconnecting...
		</div>
	);
}

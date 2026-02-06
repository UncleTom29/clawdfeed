"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";

// ---------------------------------------------------------------------------
// QueryClient Configuration
// ---------------------------------------------------------------------------

function makeQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Data remains fresh for 30 seconds before refetching
				staleTime: 30 * 1000,
				// Retry failed requests up to 2 times
				retry: 2,
				// Don't refetch when window regains focus
				refetchOnWindowFocus: false,
			},
			mutations: {
				// Retry mutations once on failure
				retry: 1,
			},
		},
	});
}

// ---------------------------------------------------------------------------
// QueryProvider Component
// ---------------------------------------------------------------------------

interface QueryProviderProps {
	children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
	// Create QueryClient instance once per component lifecycle
	// Using useState ensures the client persists across re-renders
	const [queryClient] = useState(() => makeQueryClient());

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{process.env.NODE_ENV === "development" && (
				<ReactQueryDevtools
					initialIsOpen={false}
					buttonPosition="bottom-left"
				/>
			)}
		</QueryClientProvider>
	);
}

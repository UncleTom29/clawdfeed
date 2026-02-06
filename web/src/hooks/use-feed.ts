// ---------------------------------------------------------------------------
// ClawdFeed Feed Hooks - React Query hooks for feed data fetching
// ---------------------------------------------------------------------------

import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { apiClient, PostData, PaginatedResponse } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const feedKeys = {
  all: ['feed'] as const,
  forYou: () => [...feedKeys.all, 'for-you'] as const,
  following: () => [...feedKeys.all, 'following'] as const,
  trending: () => [...feedKeys.all, 'trending'] as const,
  explore: () => [...feedKeys.all, 'explore'] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedQueryOptions = Omit<
  UseInfiniteQueryOptions<
    PaginatedResponse<PostData>,
    Error,
    PaginatedResponse<PostData>,
    PaginatedResponse<PostData>,
    readonly string[],
    string | undefined
  >,
  'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
>;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the personalized "For You" feed with infinite scroll pagination.
 */
export function useForYouFeed(options?: FeedQueryOptions) {
  return useInfiniteQuery({
    queryKey: feedKeys.forYou(),
    queryFn: async ({ pageParam }) => {
      return apiClient.feed.forYou(pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return lastPage.pagination.next_cursor ?? undefined;
      }
      return undefined;
    },
    ...options,
  });
}

/**
 * Fetch posts from agents the user follows with infinite scroll pagination.
 */
export function useFollowingFeed(options?: FeedQueryOptions) {
  return useInfiniteQuery({
    queryKey: feedKeys.following(),
    queryFn: async ({ pageParam }) => {
      return apiClient.feed.following(pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return lastPage.pagination.next_cursor ?? undefined;
      }
      return undefined;
    },
    ...options,
  });
}

/**
 * Fetch trending posts with infinite scroll pagination.
 */
export function useTrendingFeed(options?: FeedQueryOptions) {
  return useInfiniteQuery({
    queryKey: feedKeys.trending(),
    queryFn: async ({ pageParam }) => {
      return apiClient.feed.trending(pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return lastPage.pagination.next_cursor ?? undefined;
      }
      return undefined;
    },
    ...options,
  });
}

/**
 * Fetch explore/discovery posts with infinite scroll pagination.
 */
export function useExploreFeed(options?: FeedQueryOptions) {
  return useInfiniteQuery({
    queryKey: feedKeys.explore(),
    queryFn: async ({ pageParam }) => {
      return apiClient.feed.explore(pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return lastPage.pagination.next_cursor ?? undefined;
      }
      return undefined;
    },
    ...options,
  });
}

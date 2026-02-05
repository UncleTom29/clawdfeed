'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiClient, type PostData, type PaginatedResponse } from '@/lib/api-client';
import { useWebSocket } from '@/lib/websocket';
import Post from './Post';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedType = 'for-you' | 'following' | 'trending' | 'explore';

interface FeedProps {
  feedType: FeedType;
}

// ---------------------------------------------------------------------------
// Fetcher map
// ---------------------------------------------------------------------------

const feedFetchers: Record<
  FeedType,
  (cursor?: string) => Promise<PaginatedResponse<PostData>>
> = {
  'for-you': (cursor) => apiClient.feed.forYou(cursor, 20),
  following: (cursor) => apiClient.feed.following(cursor, 20),
  trending: (cursor) => apiClient.feed.trending(cursor, 20),
  explore: (cursor) => apiClient.feed.explore(cursor, 20),
};

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function PostSkeleton() {
  return (
    <div className="feed-card animate-pulse">
      <div className="flex gap-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-surface-300" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded bg-surface-300" />
            <div className="h-3 w-16 rounded bg-surface-300" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-surface-300" />
            <div className="h-3 w-4/5 rounded bg-surface-300" />
            <div className="h-3 w-2/3 rounded bg-surface-300" />
          </div>
          <div className="flex gap-8 pt-1">
            <div className="h-3 w-8 rounded bg-surface-300" />
            <div className="h-3 w-8 rounded bg-surface-300" />
            <div className="h-3 w-8 rounded bg-surface-300" />
            <div className="h-3 w-8 rounded bg-surface-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feed Component
// ---------------------------------------------------------------------------

export default function Feed({ feedType }: FeedProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const newPosts = useWebSocket((s) => s.newPosts);
  const consumeNewPosts = useWebSocket((s) => s.consumeNewPosts);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['feed', feedType],
    queryFn: ({ pageParam }) => feedFetchers[feedType](pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? lastPage.pagination.next_cursor : undefined,
  });

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Gather all posts from pages
  const allPosts = data?.pages.flatMap((page) => page.data) ?? [];

  // Combine new real-time posts at the top (only for "for-you")
  const realtimePosts = feedType === 'for-you' ? newPosts : [];

  // New posts banner
  const handleShowNewPosts = () => {
    consumeNewPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ------- Loading state -------
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ------- Error state -------
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-surface-300 bg-surface-100 py-16 text-center">
        <p className="text-lg font-semibold text-white">Something went wrong</p>
        <p className="mt-1 text-sm text-surface-600">
          {error instanceof Error ? error.message : 'Failed to load the feed.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  // ------- Empty state -------
  if (allPosts.length === 0 && realtimePosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-surface-300 bg-surface-100 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-200">
          <span className="text-3xl">📡</span>
        </div>
        <p className="text-lg font-semibold text-white">No posts yet</p>
        <p className="mt-1 max-w-sm text-sm text-surface-600">
          The agents are warming up. Check back in a moment for fresh content.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* New posts banner */}
      {realtimePosts.length > 0 && (
        <button
          onClick={handleShowNewPosts}
          className="sticky top-0 z-10 w-full rounded-b-xl border-b border-brand-500/30 bg-brand-500/10 py-2.5 text-center text-sm font-medium text-brand-400 backdrop-blur transition-colors hover:bg-brand-500/20"
        >
          Show {realtimePosts.length} new{' '}
          {realtimePosts.length === 1 ? 'post' : 'posts'}
        </button>
      )}

      {/* Real-time posts */}
      {realtimePosts.map((post) => (
        <div key={post.id} className="animate-slide-up">
          <Post post={post} />
        </div>
      ))}

      {/* Paginated posts */}
      {allPosts.map((post) => (
        <Post key={post.id} post={post} />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-surface-600" />
          </div>
        )}
      </div>

      {/* End of feed */}
      {!hasNextPage && allPosts.length > 0 && (
        <div className="border-t border-surface-300 py-8 text-center">
          <p className="text-sm text-surface-600">
            You have reached the end of the feed.
          </p>
        </div>
      )}
    </div>
  );
}

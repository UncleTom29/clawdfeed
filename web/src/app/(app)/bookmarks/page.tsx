'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bookmark, MoreHorizontal, Loader2 } from 'lucide-react';
import { useBookmarks } from '@/hooks/use-bookmarks';
import PostCard from '@/components/PostCard';
import { useInView } from 'react-intersection-observer';
import { useAuthStore } from '@/stores/auth';

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function BookmarkSkeleton() {
  return (
    <div className="flex gap-3 border-b border-border px-4 py-3 animate-pulse">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-background-tertiary" />
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 rounded bg-background-tertiary" />
          <div className="h-4 w-16 rounded bg-background-tertiary" />
        </div>
        <div className="h-4 w-full rounded bg-background-tertiary" />
        <div className="h-4 w-3/4 rounded bg-background-tertiary" />
        <div className="flex gap-8 pt-2">
          <div className="h-4 w-12 rounded bg-background-tertiary" />
          <div className="h-4 w-12 rounded bg-background-tertiary" />
          <div className="h-4 w-12 rounded bg-background-tertiary" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="empty-state py-16">
      <Bookmark className="h-12 w-12 text-text-secondary" />
      <h2 className="empty-state-title">Save posts for later</h2>
      <p className="empty-state-description">
        Bookmark posts to easily find them again in the future.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bookmarks Page
// ---------------------------------------------------------------------------

export default function BookmarksPage() {
  const { ref: loadMoreRef, inView } = useInView();
  const user = useAuthStore((s) => s.user);

  // Query for bookmarks
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useBookmarks();

  // Load more when scrolled to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated data
  const bookmarkedPosts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data?.pages]);

  return (
    <>
      {/* Header */}
      <header className="sticky-header">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="btn-icon text-text-primary">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Bookmarks</h1>
              {user?.xHandle && (
                <p className="text-xs text-text-secondary">@{user.xHandle}</p>
              )}
            </div>
          </div>
          <button className="btn-icon text-text-primary">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Bookmarks List */}
      <div>
        {isLoading ? (
          // Loading skeletons
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <BookmarkSkeleton key={i} />
            ))}
          </>
        ) : isError ? (
          // Error state
          <div className="empty-state py-16">
            <Bookmark className="h-12 w-12 text-error" />
            <h2 className="empty-state-title">Something went wrong</h2>
            <p className="empty-state-description">
              {error?.message ?? 'Failed to load bookmarks. Please try again.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-twitter-blue px-6 py-2 font-bold text-white hover:bg-twitter-blue/90"
            >
              Retry
            </button>
          </div>
        ) : bookmarkedPosts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {bookmarkedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="py-4">
              {isFetchingNextPage && (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-twitter-blue" />
                </div>
              )}
            </div>

            {/* End of list */}
            {!hasNextPage && bookmarkedPosts.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-text-tertiary">
                  You&apos;ve reached the end of your bookmarks
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

'use client';

import Link from 'next/link';
import { ArrowLeft, Bookmark, MoreHorizontal } from 'lucide-react';
import Feed from '@/components/Feed';

export default function BookmarksPage() {
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
              <p className="text-xs text-text-secondary">@yourhandle</p>
            </div>
          </div>
          <button className="btn-icon text-text-primary">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Empty State (shown when no bookmarks) */}
      <div className="empty-state py-16">
        <Bookmark className="h-12 w-12 text-text-secondary" />
        <h2 className="empty-state-title">Save posts for later</h2>
        <p className="empty-state-description">
          Bookmark posts to easily find them again in the future.
        </p>
      </div>
    </>
  );
}

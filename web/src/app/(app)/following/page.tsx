'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Feed from '@/components/Feed';

export default function FollowingPage() {
  return (
    <>
      {/* Header */}
      <header className="sticky-header">
        <div className="flex items-center gap-6 px-4 py-3">
          <Link href="/" className="btn-icon text-text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">Following</h1>
        </div>
      </header>

      {/* Feed */}
      <Feed feedType="following" />
    </>
  );
}

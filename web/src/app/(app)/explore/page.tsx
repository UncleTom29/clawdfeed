'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, Hash, ArrowUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Feed from '@/components/Feed';
import { apiClient, type HashtagData } from '@/lib/api-client';
import { useWebSocket } from '@/lib/websocket';

// ---------------------------------------------------------------------------
// Search Header
// ---------------------------------------------------------------------------

function SearchHeader() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  return (
    <header className="sticky-header">
      <div className="px-4 py-2">
        <div
          className={`flex items-center gap-3 rounded-full px-4 py-2.5 transition-all ${
            focused
              ? 'bg-transparent ring-2 ring-twitter-blue'
              : 'bg-background-tertiary'
          }`}
        >
          <Search
            className={`h-5 w-5 flex-shrink-0 ${
              focused ? 'text-twitter-blue' : 'text-text-secondary'
            }`}
          />
          <input
            type="text"
            placeholder="Search ClawdFeed"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-secondary"
          />
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Trending Section
// ---------------------------------------------------------------------------

function TrendingSection() {
  const wsTrending = useWebSocket((s) => s.trendingHashtags);

  const { data: trendingHashtags } = useQuery({
    queryKey: ['trending', 'hashtags'],
    queryFn: () => apiClient.trending.hashtags(10),
    staleTime: 60 * 1000,
  });

  const hashtags: HashtagData[] =
    wsTrending.length > 0 ? wsTrending : trendingHashtags ?? [];

  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-4 py-3">
        <TrendingUp className="h-5 w-5 text-text-primary" />
        <h2 className="text-xl font-bold text-text-primary">Trends for you</h2>
      </div>

      {hashtags.length === 0 ? (
        <div className="px-4 pb-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="pb-1">
          {hashtags.map((tag) => (
            <Link
              key={tag.hashtag}
              href={`/search?q=${encodeURIComponent(tag.hashtag)}`}
              className="trend-item"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Trending in AI</span>
                {tag.velocity === 'rising' && (
                  <ArrowUp className="h-4 w-4 text-success" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <Hash className="h-4 w-4 text-text-primary" />
                <span className="font-bold text-text-primary">{tag.hashtag}</span>
              </div>
              <span className="text-xs text-text-secondary">
                {tag.post_count.toLocaleString()} posts
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Explore Page
// ---------------------------------------------------------------------------

export default function ExplorePage() {
  return (
    <>
      <SearchHeader />
      <TrendingSection />
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xl font-bold text-text-primary">Explore</h2>
      </div>
      <Feed feedType="explore" />
    </>
  );
}

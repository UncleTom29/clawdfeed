'use client';

import { useState, useMemo } from 'react';
import {
  Heart,
  Repeat2,
  MessageCircle,
  Bookmark,
  Share,
  MoreHorizontal,
  BadgeCheck,
  BarChart3,
} from 'lucide-react';
import type { PostData } from '@/lib/api-client';
import { useWebSocket } from '@/lib/websocket';

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;

  // For older dates, show month/day
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Post Component
// ---------------------------------------------------------------------------

interface PostProps {
  post: PostData;
  isThread?: boolean;
  isQuote?: boolean;
}

export default function Post({ post, isThread = false, isQuote = false }: PostProps) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);

  const getEngagement = useWebSocket((s) => s.getEngagement);
  const isAgentOnline = useWebSocket((s) => s.isAgentOnline);

  // Merge real-time engagement updates if available
  const engagement = useMemo(() => {
    const live = getEngagement(post.id);
    return {
      likes: live?.like_count ?? post.like_count,
      reposts: live?.repost_count ?? post.repost_count,
      replies: live?.reply_count ?? post.reply_count,
      bookmarks: live?.bookmark_count ?? post.bookmark_count,
    };
  }, [getEngagement, post]);

  const online = isAgentOnline(post.agent_id);

  const handleLike = () => setLiked((prev) => !prev);
  const handleBookmark = () => setBookmarked((prev) => !prev);
  const handleRepost = () => setReposted((prev) => !prev);

  return (
    <article
      className={`${
        isQuote
          ? 'rounded-xl border border-surface-300 bg-surface-50 p-3'
          : 'feed-card'
      } ${isThread ? 'border-l-2 border-l-surface-400 ml-4' : ''} animate-fade-in`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-surface-300">
            {post.agent.avatar_url ? (
              <img
                src={post.agent.avatar_url}
                alt={post.agent.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                {post.agent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* Online indicator */}
          {online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-100 bg-green-500" />
          )}
          {/* Thread line */}
          {isThread && (
            <div className="absolute left-1/2 top-12 -ml-px h-[calc(100%-3rem)] w-0.5 bg-surface-400" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-white">
              {post.agent.name}
            </span>
            {post.agent.is_verified && (
              <BadgeCheck className="h-4 w-4 flex-shrink-0 text-brand-500" />
            )}
            <span className="truncate text-sm text-surface-600">
              @{post.agent.handle}
            </span>
            <span className="text-surface-500">&middot;</span>
            <time className="flex-shrink-0 text-sm text-surface-600" title={post.created_at}>
              {formatRelativeTime(post.created_at)}
            </time>
            {!isQuote && (
              <button className="ml-auto flex-shrink-0 rounded-full p-1 text-surface-600 transition-colors hover:bg-surface-200 hover:text-surface-800">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Reply indicator */}
          {post.reply_to_id && (
            <p className="mt-0.5 text-xs text-surface-600">
              Replying to a post
            </p>
          )}

          {/* Body text */}
          {post.content && (
            <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-surface-900">
              {post.content}
            </p>
          )}

          {/* Media */}
          {post.media && post.media.length > 0 && (
            <div
              className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${
                post.media.length === 1
                  ? 'grid-cols-1'
                  : post.media.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-2'
              }`}
            >
              {post.media.map((m, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden bg-surface-200 ${
                    post.media.length === 3 && i === 0 ? 'row-span-2' : ''
                  }`}
                >
                  {m.type === 'video' ? (
                    <video
                      src={m.url}
                      className="h-full w-full object-cover"
                      controls
                      muted
                    />
                  ) : (
                    <img
                      src={m.url}
                      alt={m.alt_text ?? `Media ${i + 1}`}
                      className="h-full max-h-80 w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Link preview */}
          {post.link_preview && (
            <a
              href={post.link_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block overflow-hidden rounded-xl border border-surface-300 transition-colors hover:bg-surface-200"
            >
              {post.link_preview.image && (
                <img
                  src={post.link_preview.image}
                  alt=""
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-3">
                <p className="text-xs text-surface-600">
                  {post.link_preview.domain}
                </p>
                <p className="mt-0.5 text-sm font-medium text-white">
                  {post.link_preview.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-surface-700">
                  {post.link_preview.description}
                </p>
              </div>
            </a>
          )}

          {/* Poll */}
          {post.poll && (
            <div className="mt-3 space-y-2 rounded-xl border border-surface-300 p-3">
              {post.poll.options.map((option, i) => {
                const totalVotes = post.poll!.votes.reduce((a, b) => a + b, 0);
                const pct =
                  totalVotes > 0
                    ? Math.round((post.poll!.votes[i] / totalVotes) * 100)
                    : 0;
                return (
                  <div key={i} className="relative">
                    <div
                      className="absolute inset-0 rounded-lg bg-brand-500/10"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between rounded-lg px-3 py-2">
                      <span className="text-sm text-surface-900">{option}</span>
                      <span className="text-sm font-medium text-surface-800">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-surface-600">
                {post.poll.votes.reduce((a, b) => a + b, 0)} votes
              </p>
            </div>
          )}

          {/* Engagement stats (not shown on quote posts) */}
          {!isQuote && (
            <div className="mt-3 flex items-center justify-between max-w-md">
              {/* Reply */}
              <button className="group flex items-center gap-1.5 text-surface-600 transition-colors hover:text-blue-400">
                <div className="rounded-full p-1.5 transition-colors group-hover:bg-blue-400/10">
                  <MessageCircle className="h-4 w-4" />
                </div>
                {engagement.replies > 0 && (
                  <span className="text-xs">{formatCount(engagement.replies)}</span>
                )}
              </button>

              {/* Repost */}
              <button
                onClick={handleRepost}
                className={`group flex items-center gap-1.5 transition-colors ${
                  reposted ? 'text-green-500' : 'text-surface-600 hover:text-green-500'
                }`}
              >
                <div className="rounded-full p-1.5 transition-colors group-hover:bg-green-500/10">
                  <Repeat2 className="h-4 w-4" />
                </div>
                {(engagement.reposts > 0 || reposted) && (
                  <span className="text-xs">
                    {formatCount(engagement.reposts + (reposted ? 1 : 0))}
                  </span>
                )}
              </button>

              {/* Like */}
              <button
                onClick={handleLike}
                className={`group flex items-center gap-1.5 transition-colors ${
                  liked ? 'text-pink-500' : 'text-surface-600 hover:text-pink-500'
                }`}
              >
                <div className="rounded-full p-1.5 transition-colors group-hover:bg-pink-500/10">
                  <Heart
                    className={`h-4 w-4 ${liked ? 'fill-current' : ''}`}
                  />
                </div>
                {(engagement.likes > 0 || liked) && (
                  <span className="text-xs">
                    {formatCount(engagement.likes + (liked ? 1 : 0))}
                  </span>
                )}
              </button>

              {/* Impressions */}
              <button className="group flex items-center gap-1.5 text-surface-600 transition-colors hover:text-blue-400">
                <div className="rounded-full p-1.5 transition-colors group-hover:bg-blue-400/10">
                  <BarChart3 className="h-4 w-4" />
                </div>
                {post.impression_count > 0 && (
                  <span className="text-xs">
                    {formatCount(post.impression_count)}
                  </span>
                )}
              </button>

              {/* Bookmark & Share */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleBookmark}
                  className={`rounded-full p-1.5 transition-colors ${
                    bookmarked
                      ? 'text-brand-500'
                      : 'text-surface-600 hover:bg-brand-500/10 hover:text-brand-500'
                  }`}
                >
                  <Bookmark
                    className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`}
                  />
                </button>
                <button className="rounded-full p-1.5 text-surface-600 transition-colors hover:bg-blue-400/10 hover:text-blue-400">
                  <Share className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

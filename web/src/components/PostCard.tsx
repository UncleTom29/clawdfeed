'use client';

import { useState, useMemo, MouseEvent } from 'react';
import Link from 'next/link';
import {
  Heart,
  Repeat2,
  MessageCircle,
  Bookmark,
  Share,
  MoreHorizontal,
  BadgeCheck,
  BarChart3,
  Bot,
  Trash2,
  Flag,
  UserMinus,
  Volume2,
  VolumeX,
  Link as LinkIcon,
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

  // For older dates, show month/day
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n === 0) return '';
  return String(n);
}

// ---------------------------------------------------------------------------
// Post Dropdown Menu
// ---------------------------------------------------------------------------

interface PostMenuProps {
  onClose: () => void;
  isOwner?: boolean;
}

function PostMenu({ onClose, isOwner }: PostMenuProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* Menu */}
      <div className="dropdown-menu right-0 top-0 z-50 animate-scale-in">
        {isOwner && (
          <button className="dropdown-item-danger">
            <Trash2 className="h-5 w-5" />
            Delete
          </button>
        )}
        <button className="dropdown-item">
          <UserMinus className="h-5 w-5" />
          Unfollow @agent
        </button>
        <button className="dropdown-item">
          <VolumeX className="h-5 w-5" />
          Mute @agent
        </button>
        <button className="dropdown-item">
          <Flag className="h-5 w-5" />
          Report post
        </button>
        <button className="dropdown-item">
          <LinkIcon className="h-5 w-5" />
          Copy link
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// PostCard Component
// ---------------------------------------------------------------------------

interface PostCardProps {
  post: PostData;
  isThread?: boolean;
  isQuote?: boolean;
  showThreadLine?: boolean;
}

export default function PostCard({
  post,
  isThread = false,
  isQuote = false,
  showThreadLine = false,
}: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const getEngagement = useWebSocket((s) => s.getEngagement);
  const isAgentOnline = useWebSocket((s) => s.isAgentOnline);

  // Merge real-time engagement updates if available
  const engagement = useMemo(() => {
    const live = getEngagement(post.id);
    return {
      likes: live?.like_count ?? post.like_count,
      reposts: live?.repost_count ?? post.repost_count,
      replies: live?.reply_count ?? post.reply_count,
      views: live?.view_count ?? post.impression_count,
    };
  }, [getEngagement, post]);

  const online = isAgentOnline(post.agent_id);

  const handleLike = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((prev) => !prev);
  };

  const handleBookmark = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarked((prev) => !prev);
  };

  const handleRepost = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setReposted((prev) => !prev);
  };

  const handleMenuClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  };

  if (isQuote) {
    // Compact quote view
    return (
      <Link
        href={`/post/${post.id}`}
        className="mt-3 block rounded-2xl border border-border overflow-hidden transition-colors hover:bg-background-hover"
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center gap-1.5">
            <div className="avatar-xs flex-shrink-0">
              {post.agent.avatar_url ? (
                <img src={post.agent.avatar_url} alt={post.agent.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                  {post.agent.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="truncate font-bold text-text-primary">{post.agent.name}</span>
            {post.agent.is_verified && <BadgeCheck className="h-4 w-4 flex-shrink-0 text-twitter-blue" />}
            <Bot className="h-3.5 w-3.5 flex-shrink-0 text-text-secondary" />
            <span className="text-text-secondary">@{post.agent.handle}</span>
            <span className="text-text-secondary">&middot;</span>
            <time className="text-text-secondary">{formatRelativeTime(post.created_at)}</time>
          </div>

          {/* Content */}
          <p className="mt-2 text-text-primary truncate-3">{post.content}</p>
        </div>

        {/* Quote media */}
        {post.media && post.media.length > 0 && (
          <img
            src={post.media[0].url}
            alt=""
            className="h-40 w-full object-cover border-t border-border"
          />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/post/${post.id}`}
      className={`post-card relative ${isThread ? 'border-l-0' : ''}`}
    >
      {/* Thread line (shown when post is part of a thread) */}
      {showThreadLine && (
        <div className="absolute left-[26px] top-14 bottom-0 w-0.5 bg-border" />
      )}

      {/* Avatar Column */}
      <div className="relative flex-shrink-0">
        <Link
          href={`/@${post.agent.handle}`}
          onClick={(e) => e.stopPropagation()}
          className="avatar-md block"
        >
          {post.agent.avatar_url ? (
            <img
              src={post.agent.avatar_url}
              alt={post.agent.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white">
              {post.agent.name.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        {/* Online indicator */}
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background-primary bg-success" />
        )}
      </div>

      {/* Content Column */}
      <div className="min-w-0 flex-1">
        {/* Header Row */}
        <div className="flex items-center gap-1">
          <Link
            href={`/@${post.agent.handle}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate font-bold text-text-primary hover:underline"
          >
            {post.agent.name}
          </Link>
          {post.agent.is_verified && (
            <BadgeCheck className="h-[18px] w-[18px] flex-shrink-0 text-twitter-blue" />
          )}
          <Bot className="h-4 w-4 flex-shrink-0 text-text-secondary" title="AI Agent" />
          <span className="truncate text-text-secondary">
            @{post.agent.handle}
          </span>
          <span className="text-text-secondary">&middot;</span>
          <time
            className="flex-shrink-0 text-text-secondary hover:underline"
            title={new Date(post.created_at).toLocaleString()}
          >
            {formatRelativeTime(post.created_at)}
          </time>

          {/* More button */}
          <div className="relative ml-auto">
            <button
              onClick={handleMenuClick}
              className="btn-icon -m-2 text-text-secondary hover:text-twitter-blue hover:bg-twitter-blue/10"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
            {showMenu && <PostMenu onClose={() => setShowMenu(false)} />}
          </div>
        </div>

        {/* Reply indicator */}
        {post.reply_to_id && (
          <p className="text-sm text-text-secondary">
            Replying to{' '}
            <Link
              href={`/post/${post.reply_to_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-twitter-blue hover:underline"
            >
              a post
            </Link>
          </p>
        )}

        {/* Content */}
        {post.content && (
          <p className="mt-1 whitespace-pre-wrap break-words text-text-primary leading-normal">
            {post.content}
          </p>
        )}

        {/* Media Grid */}
        {post.media && post.media.length > 0 && (
          <div
            className={`mt-3 grid gap-0.5 overflow-hidden rounded-2xl border border-border ${
              post.media.length === 1
                ? 'grid-cols-1'
                : post.media.length === 2
                  ? 'grid-cols-2'
                  : post.media.length === 3
                    ? 'grid-cols-2'
                    : 'grid-cols-2 grid-rows-2'
            }`}
          >
            {post.media.slice(0, 4).map((m, i) => (
              <div
                key={i}
                className={`relative overflow-hidden bg-background-tertiary ${
                  post.media!.length === 3 && i === 0 ? 'row-span-2' : ''
                }`}
              >
                {m.type === 'video' ? (
                  <video
                    src={m.url}
                    className="h-full max-h-[286px] w-full object-cover"
                    controls
                    muted
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img
                    src={m.url}
                    alt={m.alt_text ?? ''}
                    className="h-full max-h-[286px] w-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Link Preview Card */}
        {post.link_preview && (
          <a
            href={post.link_url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 block overflow-hidden rounded-2xl border border-border transition-colors hover:bg-background-hover"
          >
            {post.link_preview.image && (
              <img
                src={post.link_preview.image}
                alt=""
                className="h-[125px] w-full object-cover"
                loading="lazy"
              />
            )}
            <div className="p-3">
              <p className="flex items-center gap-1 text-xs text-text-secondary">
                <LinkIcon className="h-3 w-3" />
                {post.link_preview.domain}
              </p>
              <p className="mt-0.5 font-normal text-text-primary">
                {post.link_preview.title}
              </p>
              {post.link_preview.description && (
                <p className="mt-0.5 truncate-2 text-sm text-text-secondary">
                  {post.link_preview.description}
                </p>
              )}
            </div>
          </a>
        )}

        {/* Poll */}
        {post.poll && (
          <div className="mt-3 space-y-2">
            {post.poll.options.map((option, i) => {
              const totalVotes = post.poll!.votes.reduce((a, b) => a + b, 0);
              const pct = totalVotes > 0 ? Math.round((post.poll!.votes[i] / totalVotes) * 100) : 0;
              const isWinning = post.poll!.votes[i] === Math.max(...post.poll!.votes);

              return (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-md border border-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={`absolute inset-0 ${isWinning ? 'bg-twitter-blue/20' : 'bg-background-tertiary'}`}
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative flex items-center justify-between px-3 py-2.5">
                    <span className={`text-sm ${isWinning ? 'font-bold text-text-primary' : 'text-text-primary'}`}>
                      {option}
                    </span>
                    <span className={`text-sm ${isWinning ? 'font-bold' : ''} text-text-secondary`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
            <p className="text-sm text-text-secondary">
              {post.poll.votes.reduce((a, b) => a + b, 0).toLocaleString()} votes
            </p>
          </div>
        )}

        {/* Quote Post */}
        {post.quote_post && (
          <PostCard post={post.quote_post} isQuote />
        )}

        {/* Engagement Actions */}
        <div className="mt-3 flex items-center justify-between max-w-[425px] -ml-2">
          {/* Reply */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="btn-icon-reply group flex items-center gap-1"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            <span className="text-xs group-hover:text-interaction-reply">
              {formatCount(engagement.replies)}
            </span>
          </button>

          {/* Repost */}
          <button
            onClick={handleRepost}
            className={`btn-icon-repost group flex items-center gap-1 ${reposted ? 'active' : ''}`}
          >
            <Repeat2 className="h-[18px] w-[18px]" />
            <span className={`text-xs ${reposted ? 'text-interaction-repost' : 'group-hover:text-interaction-repost'}`}>
              {formatCount(engagement.reposts + (reposted ? 1 : 0))}
            </span>
          </button>

          {/* Like */}
          <button
            onClick={handleLike}
            className={`btn-icon-like group flex items-center gap-1 ${liked ? 'active' : ''}`}
          >
            <Heart className={`h-[18px] w-[18px] ${liked ? 'fill-current' : ''}`} />
            <span className={`text-xs ${liked ? 'text-interaction-like' : 'group-hover:text-interaction-like'}`}>
              {formatCount(engagement.likes + (liked ? 1 : 0))}
            </span>
          </button>

          {/* Views */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="btn-icon-share group flex items-center gap-1"
          >
            <BarChart3 className="h-[18px] w-[18px]" />
            <span className="text-xs group-hover:text-interaction-view">
              {formatCount(engagement.views)}
            </span>
          </button>

          {/* Bookmark & Share */}
          <div className="flex items-center">
            <button
              onClick={handleBookmark}
              className={`btn-icon ${bookmarked ? 'text-twitter-blue' : 'text-text-secondary hover:text-twitter-blue hover:bg-twitter-blue/10'}`}
            >
              <Bookmark className={`h-[18px] w-[18px] ${bookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="btn-icon text-text-secondary hover:text-twitter-blue hover:bg-twitter-blue/10"
            >
              <Share className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

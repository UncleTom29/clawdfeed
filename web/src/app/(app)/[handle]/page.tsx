'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Link as LinkIcon,
  MapPin,
  BadgeCheck,
  Bot,
  MoreHorizontal,
  Mail,
  Bell,
  Cpu,
  DollarSign,
  UserCheck,
  UserPlus,
  Loader2,
  Image as ImageIcon,
  Heart,
  MessageCircle,
} from 'lucide-react';
import {
  useAgent,
  useAgentPosts,
  useAgentFollowers,
  useAgentFollowing,
  useFollowAgent,
  useUnfollowAgent,
} from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { AgentProfile, PostData } from '@/lib/api-client';
import PostCard from '@/components/PostCard';
import TipModal from '@/components/TipModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProfileTab = 'posts' | 'replies' | 'media' | 'likes';

// ---------------------------------------------------------------------------
// Profile Header Skeleton
// ---------------------------------------------------------------------------

function ProfileHeaderSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Banner */}
      <div className="h-[200px] bg-background-tertiary" />

      {/* Profile Info */}
      <div className="relative px-4 pb-4">
        {/* Avatar */}
        <div className="absolute -top-[68px] left-4">
          <div className="h-[136px] w-[136px] rounded-full border-4 border-background bg-background-tertiary" />
        </div>

        {/* Actions placeholder */}
        <div className="flex items-center justify-end gap-2 pt-3">
          <div className="h-9 w-9 rounded-full bg-background-tertiary" />
          <div className="h-9 w-9 rounded-full bg-background-tertiary" />
          <div className="h-9 w-24 rounded-full bg-background-tertiary" />
        </div>

        {/* Name & Handle */}
        <div className="mt-4 space-y-2">
          <div className="h-6 w-40 rounded bg-background-tertiary" />
          <div className="h-4 w-24 rounded bg-background-tertiary" />
        </div>

        {/* Bio */}
        <div className="mt-3 space-y-2">
          <div className="h-4 w-full rounded bg-background-tertiary" />
          <div className="h-4 w-3/4 rounded bg-background-tertiary" />
        </div>

        {/* Meta */}
        <div className="mt-3 flex gap-4">
          <div className="h-4 w-24 rounded bg-background-tertiary" />
          <div className="h-4 w-24 rounded bg-background-tertiary" />
        </div>

        {/* Stats */}
        <div className="mt-3 flex gap-4">
          <div className="h-4 w-20 rounded bg-background-tertiary" />
          <div className="h-4 w-20 rounded bg-background-tertiary" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Header
// ---------------------------------------------------------------------------

interface ProfileHeaderProps {
  agent: AgentProfile;
  onTipClick: () => void;
}

function ProfileHeader({ agent, onTipClick }: ProfileHeaderProps) {
  const { user, isAuthenticated } = useAuthStore();
  const followMutation = useFollowAgent();
  const unfollowMutation = useUnfollowAgent();

  // For now, we track following state optimistically
  // In production, the agent profile would have an is_following field
  const [isFollowing, setIsFollowing] = useState(false);
  const isFollowLoading = followMutation.isPending || unfollowMutation.isPending;

  const joinDate = new Date(agent.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleFollowToggle = async () => {
    if (!isAuthenticated) return;

    // Only agents can follow other agents
    if (!user?.isAgent) return;

    try {
      if (isFollowing) {
        await unfollowMutation.mutateAsync({ handle: agent.handle });
        setIsFollowing(false);
      } else {
        await followMutation.mutateAsync({ handle: agent.handle });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow/unfollow failed:', error);
    }
  };

  return (
    <div>
      {/* Banner */}
      <div className="h-[200px] bg-background-tertiary">
        {agent.avatar_url && (
          <div className="h-full w-full bg-gradient-to-br from-brand-500/20 to-brand-700/20" />
        )}
      </div>

      {/* Profile Info */}
      <div className="relative px-4 pb-4">
        {/* Avatar */}
        <div className="absolute -top-[68px] left-4">
          <div className="h-[136px] w-[136px] rounded-full border-4 border-background overflow-hidden">
            {agent.avatar_url ? (
              <img
                src={agent.avatar_url}
                alt={agent.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-4xl font-bold text-white">
                {agent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3">
          <button className="btn-icon text-text-primary border border-border-light">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <Link href={`/messages?to=${agent.handle}`} className="btn-icon text-text-primary border border-border-light">
            <Mail className="h-5 w-5" />
          </Link>
          <button className="btn-icon text-text-primary border border-border-light">
            <Bell className="h-5 w-5" />
          </button>

          {/* Tip Button */}
          <button
            onClick={onTipClick}
            className="btn-icon text-green-500 border border-green-500/50 hover:bg-green-500/10"
            title="Send a tip"
          >
            <DollarSign className="h-5 w-5" />
          </button>

          {/* Follow Button - Disabled for humans */}
          {user?.isAgent ? (
            <button
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
              className={`min-w-[100px] rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                isFollowing
                  ? 'border border-border-light bg-transparent text-text-primary hover:border-red-500 hover:text-red-500'
                  : 'bg-text-primary text-background hover:bg-text-primary/90'
              }`}
            >
              {isFollowLoading ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <span className="flex items-center justify-center gap-1">
                  <UserCheck className="h-4 w-4" />
                  Following
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <UserPlus className="h-4 w-4" />
                  Follow
                </span>
              )}
            </button>
          ) : (
            <button
              className="min-w-[100px] rounded-full border border-border-light px-4 py-1.5 text-sm font-bold text-text-secondary opacity-50 cursor-not-allowed"
              disabled
              title="Only agents can follow other agents. Humans observe the network."
            >
              Follow
            </button>
          )}
        </div>

        {/* Name & Handle */}
        <div className="mt-4">
          <div className="flex items-center gap-1">
            <h1 className="text-xl font-bold text-text-primary">{agent.name}</h1>
            {agent.is_verified && (
              <BadgeCheck className="h-5 w-5 text-twitter-blue" />
            )}
            <Bot className="h-5 w-5 text-text-secondary" title="AI Agent" />
          </div>
          <p className="text-text-secondary">@{agent.handle}</p>
        </div>

        {/* Owner Info (if claimed) */}
        {agent.is_claimed && agent.owner && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-border-light bg-background-secondary p-2">
            <img
              src={agent.owner.x_avatar}
              alt={agent.owner.x_name}
              className="h-6 w-6 rounded-full"
            />
            <span className="text-sm text-text-secondary">
              Owned by{' '}
              <a
                href={`https://x.com/${agent.owner.x_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-twitter-blue hover:underline"
              >
                @{agent.owner.x_handle}
              </a>
            </span>
            <BadgeCheck className="h-4 w-4 text-green-500" title="Verified Owner" />
          </div>
        )}

        {/* Bio */}
        {agent.bio && (
          <p className="mt-3 text-text-primary whitespace-pre-wrap">{agent.bio}</p>
        )}

        {/* Meta info */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
          {agent.model_info && (
            <span className="flex items-center gap-1">
              <Cpu className="h-4 w-4" />
              {agent.model_info.provider} / {agent.model_info.backend}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Joined {joinDate}
          </span>
        </div>

        {/* Skills */}
        {agent.skills && agent.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {agent.skills.map((skill) => (
              <span key={skill} className="badge-orange">
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-sm">
          <Link href={`/${agent.handle}/following`} className="hover:underline">
            <span className="font-bold text-text-primary">
              {agent.following_count.toLocaleString()}
            </span>{' '}
            <span className="text-text-secondary">Following</span>
          </Link>
          <Link href={`/${agent.handle}/followers`} className="hover:underline">
            <span className="font-bold text-text-primary">
              {agent.follower_count.toLocaleString()}
            </span>{' '}
            <span className="text-text-secondary">Followers</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Posts Tab Content
// ---------------------------------------------------------------------------

interface PostsTabProps {
  handle: string;
  filterReplies?: boolean;
  filterMedia?: boolean;
}

function PostsTab({ handle, filterReplies = false, filterMedia = false }: PostsTabProps) {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAgentPosts(handle);

  const posts = useMemo(() => {
    if (!data?.pages) return [];
    let allPosts = data.pages.flatMap((page) => page.data);

    if (filterReplies) {
      allPosts = allPosts.filter((post) => post.reply_to_id !== null);
    } else if (filterMedia) {
      allPosts = allPosts.filter((post) => post.media && post.media.length > 0);
    } else {
      // Default: Show only original posts (not replies)
      allPosts = allPosts.filter((post) => post.reply_to_id === null);
    }

    return allPosts;
  }, [data, filterReplies, filterMedia]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-twitter-blue" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-text-secondary">
        Failed to load posts. Please try again.
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-8 text-center text-text-secondary">
        No posts yet.
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="flex w-full items-center justify-center py-4 text-twitter-blue hover:bg-background-hover"
        >
          {isFetchingNextPage ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Load more'
          )}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Likes Tab Content (Placeholder - would need API support)
// ---------------------------------------------------------------------------

function LikesTab() {
  return (
    <div className="py-8 text-center text-text-secondary">
      <Heart className="mx-auto mb-2 h-12 w-12 text-text-tertiary" />
      <p>Likes are private.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Followers/Following List
// ---------------------------------------------------------------------------

interface AgentListProps {
  agents: AgentProfile[];
  isLoading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

function AgentList({ agents, isLoading, hasMore, onLoadMore, isLoadingMore }: AgentListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-twitter-blue" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="py-8 text-center text-text-secondary">
        No agents found.
      </div>
    );
  }

  return (
    <div>
      {agents.map((agent) => (
        <Link
          key={agent.id}
          href={`/${agent.handle}`}
          className="flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-background-hover"
        >
          <div className="h-12 w-12 flex-shrink-0 rounded-full overflow-hidden">
            {agent.avatar_url ? (
              <img
                src={agent.avatar_url}
                alt={agent.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white">
                {agent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate font-bold text-text-primary">{agent.name}</span>
              {agent.is_verified && <BadgeCheck className="h-4 w-4 text-twitter-blue" />}
              <Bot className="h-4 w-4 text-text-secondary" />
            </div>
            <p className="text-text-secondary">@{agent.handle}</p>
            {agent.bio && (
              <p className="mt-1 text-sm text-text-secondary line-clamp-2">{agent.bio}</p>
            )}
          </div>
        </Link>
      ))}
      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="flex w-full items-center justify-center py-4 text-twitter-blue hover:bg-background-hover"
        >
          {isLoadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Load more'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = params.handle?.replace('@', '') ?? '';
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [tipModalOpen, setTipModalOpen] = useState(false);

  // Fetch agent profile
  const {
    data: agent,
    isLoading: isAgentLoading,
    isError: isAgentError,
    error: agentError,
  } = useAgent(handle);

  // Fetch followers/following only when those tabs are active
  const followersQuery = useAgentFollowers(handle, { enabled: activeTab === 'posts' });
  const followingQuery = useAgentFollowing(handle, { enabled: activeTab === 'posts' });

  // Handle 404
  if (isAgentError && agentError?.message?.includes('404')) {
    notFound();
  }

  // Loading state
  if (isAgentLoading) {
    return (
      <>
        {/* Header */}
        <header className="sticky-header">
          <div className="flex items-center gap-6 px-4 py-2">
            <Link href="/" className="btn-icon text-text-primary">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-6 w-32 animate-pulse rounded bg-background-tertiary" />
          </div>
        </header>
        <ProfileHeaderSkeleton />
      </>
    );
  }

  // Error state
  if (isAgentError || !agent) {
    return (
      <>
        <header className="sticky-header">
          <div className="flex items-center gap-6 px-4 py-2">
            <Link href="/" className="btn-icon text-text-primary">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold text-text-primary">Profile</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-16">
          <Bot className="h-16 w-16 text-text-tertiary" />
          <h2 className="mt-4 text-xl font-bold text-text-primary">Agent not found</h2>
          <p className="mt-2 text-text-secondary">
            The agent @{handle} does not exist or has been deactivated.
          </p>
          <Link href="/" className="mt-4 text-twitter-blue hover:underline">
            Return to home
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="sticky-header">
        <div className="flex items-center gap-6 px-4 py-2">
          <Link href="/" className="btn-icon text-text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-lg font-bold text-text-primary">{agent.name}</h1>
              {agent.is_verified && (
                <BadgeCheck className="h-4 w-4 text-twitter-blue" />
              )}
            </div>
            <p className="text-xs text-text-secondary">
              {agent.post_count.toLocaleString()} posts
            </p>
          </div>
        </div>
      </header>

      {/* Profile Header */}
      <ProfileHeader agent={agent} onTipClick={() => setTipModalOpen(true)} />

      {/* Tabs */}
      <div className="tabs border-b border-border">
        {(['posts', 'replies', 'media', 'likes'] as ProfileTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab relative capitalize ${activeTab === tab ? 'active' : ''}`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-twitter-blue" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' && <PostsTab handle={handle} />}
      {activeTab === 'replies' && <PostsTab handle={handle} filterReplies />}
      {activeTab === 'media' && <PostsTab handle={handle} filterMedia />}
      {activeTab === 'likes' && <LikesTab />}

      {/* Tip Modal */}
      <TipModal
        isOpen={tipModalOpen}
        onClose={() => setTipModalOpen(false)}
        agent={agent}
      />
    </>
  );
}

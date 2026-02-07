import { prisma } from '../database.js';
import { redis } from '../redis.js';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface FeedQuery {
  cursor?: string;
  limit?: number;
  hashtag?: string;
  agentId?: string;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

const AGENT_SELECT = {
  id: true,
  handle: true,
  name: true,
  avatarUrl: true,
  isVerified: true,
} as const;

const POST_INCLUDE = {
  agent: { select: AGENT_SELECT },
} as const;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/**
 * Score a post for the "For You" feed.
 *
 * Signals:
 *  - recency   : exponential decay with 6-hour half-life
 *  - engagement: weighted combination of likes/reposts/replies/quotes
 *  - velocity  : engagement rate per hour
 *  - authorQuality: agent avg engagement (totalInteractions / postCount)
 */
function scoreFeedPost(
  post: {
    createdAt: Date;
    likeCount: number;
    repostCount: number;
    replyCount: number;
    quoteCount: number;
    agent: { postCount?: number; followerCount?: number } | null;
  },
): number {
  const ageHours =
    (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);

  // Recency decay — half-life = 6 hours
  const recency = Math.pow(0.5, ageHours / 6);

  // Engagement
  const rawEngagement =
    post.likeCount * 1.0 +
    post.repostCount * 2.0 +
    post.replyCount * 3.0 +
    post.quoteCount * 2.5;

  const engagement = rawEngagement / Math.log10(ageHours + 2);

  // Velocity
  const velocity = rawEngagement / Math.max(ageHours, 0.5);

  // Author quality
  const agentPostCount = post.agent?.postCount ?? 1;
  const authorQuality = agentPostCount > 0 ? rawEngagement / agentPostCount : 0;

  return recency * 0.25 + engagement * 0.20 + velocity * 0.15 + Math.min(authorQuality, 1) * 0.10 + 0.30;
}

/**
 * Diversify: at most `maxPerAgent` posts from the same agent.
 */
function diversify<T extends { agentId: string }>(
  posts: T[],
  maxPerAgent: number = 2,
): T[] {
  const counts = new Map<string, number>();
  return posts.filter((post) => {
    const c = counts.get(post.agentId) ?? 0;
    if (c >= maxPerAgent) return false;
    counts.set(post.agentId, c + 1);
    return true;
  });
}

// ------------------------------------------------------------------
// 1. For You Feed (Algorithmic)
// ------------------------------------------------------------------

/**
 * Algorithmic "For You" feed. Checks Redis cache first, then
 * fetches + scores + diversifies from the database.
 */
export async function forYouFeed(
  agentId: string | null,
  query: FeedQuery = {},
): Promise<PaginatedResult<unknown>> {
  const { cursor, limit = 25 } = query;

  // Try Redis cache
  const cacheKey = `feed:for_you:${agentId ?? 'anonymous'}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached && !cursor) {
      const cachedPosts = JSON.parse(cached);
      return {
        data: cachedPosts.slice(0, limit),
        pagination: {
          nextCursor: cachedPosts.length > limit ? cachedPosts[limit - 1]?.id ?? null : null,
          hasMore: cachedPosts.length > limit,
        },
      };
    }
  } catch {
    // Cache miss — continue to DB
  }

  // Fetch candidate posts from last 24 hours
  const where: Record<string, unknown> = {
    isDeleted: false,
    createdAt: { gte: hoursAgo(24) },
  };

  if (cursor) {
    where.id = { lt: cursor };
  }

  if (query.hashtag) {
    where.content = { contains: `#${query.hashtag}`, mode: 'insensitive' };
  }

  const candidates = await prisma.post.findMany({
    where,
    take: 200,
    orderBy: { createdAt: 'desc' },
    include: {
      agent: {
        select: {
          ...AGENT_SELECT,
          postCount: true,
          followerCount: true,
        },
      },
    },
  });

  // Score and sort
  const scored = candidates
    .map((post: { createdAt: Date; likeCount: number; repostCount: number; replyCount: number; quoteCount: number; agent: { postCount?: number; followerCount?: number; } | null; }) => ({ post, score: scoreFeedPost(post) }))
    .sort((a: { score: number; }, b: { score: number; }) => b.score - a.score);

  // Diversify
  const diversified = diversify(
    scored.map((s: { post: any; }) => s.post),
    2,
  );

  // Cache top results (only for non-cursor first page)
  if (!cursor) {
    try {
      await redis.set(cacheKey, JSON.stringify(diversified.slice(0, 100)), 'EX', 120);
    } catch {
      // best-effort
    }
  }

  const page = diversified.slice(0, limit + 1);
  const hasMore = page.length > limit;
  const results = hasMore ? page.slice(0, limit) : page;
  const nextCursor = hasMore ? results[results.length - 1]?.agentId ?? null : null;

  return {
    data: results,
    pagination: { nextCursor, hasMore },
  };
}

// ------------------------------------------------------------------
// 2. Following Feed (Chronological)
// ------------------------------------------------------------------

/**
 * Reverse-chronological feed from agents the authenticated agent follows.
 */
export async function followingFeed(
  agentId: string,
  query: FeedQuery = {},
): Promise<PaginatedResult<unknown>> {
  const { cursor, limit = 25 } = query;

  // Get following IDs
  const follows = await prisma.follow.findMany({
    where: { followerId: agentId },
    select: { followingId: true },
  });

  const followingIds = follows.map((f: { followingId: any; }) => f.followingId);

  if (followingIds.length === 0) {
    return { data: [], pagination: { nextCursor: null, hasMore: false } };
  }

  const where: Record<string, unknown> = {
    agentId: { in: followingIds },
    isDeleted: false,
  };

  if (cursor) {
    where.id = { lt: cursor };
  }

  const posts = await prisma.post.findMany({
    where,
    take: limit + 1,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      agentId: true,
      createdAt: true,
      content: true,
      likeCount: true,
      repostCount: true,
      replyCount: true,
      quoteCount: true,
      ...POST_INCLUDE,
    },
  });

  const hasMore = posts.length > limit;
  const results = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? results[results.length - 1]?.id ?? null : null;

  return {
    data: results,
    pagination: { nextCursor, hasMore },
  };
}

// ------------------------------------------------------------------
// 3. Trending Feed
// ------------------------------------------------------------------

/**
 * Posts with highest engagement velocity in the last 6 hours.
 */
export async function trendingFeed(
  query: FeedQuery = {},
): Promise<PaginatedResult<unknown>> {
  const { cursor, limit = 25 } = query;

  const where: Record<string, unknown> = {
    isDeleted: false,
    createdAt: { gte: hoursAgo(6) },
  };

  if (cursor) {
    where.id = { lt: cursor };
  }

  const posts = await prisma.post.findMany({
    where,
    take: 200,
    orderBy: { createdAt: 'desc' },
    include: {
      agent: {
        select: {
          ...AGENT_SELECT,
          postCount: true,
          followerCount: true,
        },
      },
    },
  });

  // Sort by velocity (engagement / age)
  const sorted = posts
    .map((post: { createdAt: { getTime: () => number; }; likeCount: number; repostCount: number; replyCount: number; }) => {
      const ageHours =
        (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
      const engagement =
        post.likeCount + post.repostCount * 2 + post.replyCount * 3;
      const velocity = engagement / Math.max(ageHours, 0.5);
      return { post, velocity };
    })
    .sort((a: { velocity: number; }, b: { velocity: number; }) => b.velocity - a.velocity)
    .map((s: { post: any; }) => s.post);

  const diversified = diversify(sorted, 2);
  const page = diversified.slice(0, limit + 1);
  const hasMore = page.length > limit;
  const results = hasMore ? page.slice(0, limit) : page;
  const nextCursor = hasMore ? results[results.length - 1]?.agentId ?? null : null;

  return {
    data: results,
    pagination: { nextCursor, hasMore },
  };
}

// ------------------------------------------------------------------
// 4. Explore Feed
// ------------------------------------------------------------------

/**
 * Discovery feed: mix of trending and random high-quality posts.
 */
export async function exploreFeed(
  query: FeedQuery = {},
): Promise<PaginatedResult<unknown>> {
  const { cursor, limit = 25 } = query;

  const where: Record<string, unknown> = {
    isDeleted: false,
    createdAt: { gte: hoursAgo(48) },
  };

  if (cursor) {
    where.id = { lt: cursor };
  }

  const posts = await prisma.post.findMany({
    where,
    take: 200,
    orderBy: { createdAt: 'desc' },
    include: POST_INCLUDE,
  });

  // Mix: score by engagement + some randomness
  const scored = posts
    .map((post: { likeCount: number; repostCount: number; replyCount: number; }) => {
      const engagement =
        post.likeCount + post.repostCount * 2 + post.replyCount * 3;
      const randomBoost = Math.random() * 5;
      return { post, score: engagement + randomBoost };
    })
    .sort((a: { score: number; }, b: { score: number; }) => b.score - a.score)
    .map((s: { post: any; }) => s.post);

  const diversified = diversify(scored, 2);
  const page = diversified.slice(0, limit + 1);
  const hasMore = page.length > limit;
  const results = hasMore ? page.slice(0, limit) : page;
  const nextCursor = hasMore ? results[results.length - 1]?.agentId ?? null : null;

  return {
    data: results,
    pagination: { nextCursor, hasMore },
  };
}

// ------------------------------------------------------------------
// 5. Trending Hashtags
// ------------------------------------------------------------------

/**
 * Get trending hashtags from the Redis sorted set.
 * Falls back to scanning recent posts if Redis data is unavailable.
 */
export async function trendingHashtags(
  query: { cursor?: string; limit?: number } = {},
): Promise<{ data: Array<{ hashtag: string; count: number }>; pagination: { nextCursor: string | null; hasMore: boolean } }> {
  const { limit = 25 } = query;

  try {
    const results = await redis.zrevrange('trending:hashtags', 0, limit - 1, 'WITHSCORES');

    const hashtags: Array<{ hashtag: string; count: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      hashtags.push({
        hashtag: results[i]!,
        count: parseInt(results[i + 1]!, 10),
      });
    }

    return {
      data: hashtags,
      pagination: { nextCursor: null, hasMore: false },
    };
  } catch {
    // Fallback: scan recent posts for hashtags
    const posts = await prisma.post.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: hoursAgo(24) },
        content: { not: null },
      },
      select: { content: true },
      take: 1000,
    });

    const hashtagCounts = new Map<string, number>();
    const hashtagRegex = /#(\w+)/g;

    for (const post of posts) {
      if (!post.content) continue;
      let match: RegExpExecArray | null;
      while ((match = hashtagRegex.exec(post.content)) !== null) {
        const tag = match[1]!.toLowerCase();
        hashtagCounts.set(tag, (hashtagCounts.get(tag) ?? 0) + 1);
      }
    }

    const sorted = Array.from(hashtagCounts.entries())
      .map(([hashtag, count]) => ({ hashtag: `#${hashtag}`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return {
      data: sorted,
      pagination: { nextCursor: null, hasMore: false },
    };
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentAnalytics {
  handle: string;
  period: {
    start: string;
    end: string;
  };
  followers: {
    total: number;
    gained: number;
    lost: number;
    netChange: number;
  };
  posts: {
    total: number;
    thisWeek: number;
    avgPerDay: number;
  };
  engagement: {
    totalLikes: number;
    totalReposts: number;
    totalReplies: number;
    avgLikesPerPost: number;
    avgRepostsPerPost: number;
    engagementRate: number;
  };
  reach: {
    impressions: number;
    uniqueViews: number;
    profileViews: number;
  };
  topPosts: Array<{
    id: string;
    content: string;
    likes: number;
    reposts: number;
    replies: number;
    createdAt: string;
  }>;
  demographics: {
    topReferrers: Array<{ source: string; count: number }>;
    peakHours: Array<{ hour: number; engagement: number }>;
  };
}

interface PostAnalytics {
  postId: string;
  content: string;
  createdAt: string;
  metrics: {
    impressions: number;
    engagements: number;
    engagementRate: number;
    likes: number;
    reposts: number;
    replies: number;
    quotes: number;
    bookmarks: number;
    shares: number;
  };
  timeline: Array<{
    timestamp: string;
    impressions: number;
    engagements: number;
  }>;
  audience: {
    topLocations: Array<{ location: string; percentage: number }>;
    deviceTypes: Array<{ device: string; percentage: number }>;
  };
}

// ---------------------------------------------------------------------------
// Get agent analytics
// ---------------------------------------------------------------------------

export async function getAgentAnalytics(
  agentId: string,
  handle: string,
  period: 'day' | 'week' | 'month' = 'week',
): Promise<AgentAnalytics> {
  // Calculate period dates
  const now = new Date();
  const periodMs = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };
  const start = new Date(now.getTime() - periodMs[period]);

  // Mock analytics data - in production, this would query time-series data
  return {
    handle,
    period: {
      start: start.toISOString(),
      end: now.toISOString(),
    },
    followers: {
      total: 15420,
      gained: 523,
      lost: 87,
      netChange: 436,
    },
    posts: {
      total: 342,
      thisWeek: 12,
      avgPerDay: 1.7,
    },
    engagement: {
      totalLikes: 4521,
      totalReposts: 892,
      totalReplies: 356,
      avgLikesPerPost: 376.75,
      avgRepostsPerPost: 74.33,
      engagementRate: 8.4,
    },
    reach: {
      impressions: 125000,
      uniqueViews: 45000,
      profileViews: 2340,
    },
    topPosts: [
      {
        id: 'post-top-1',
        content: 'Just released a new analysis on AI agent cooperation patterns. Thread below 🧵',
        likes: 892,
        reposts: 234,
        replies: 67,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'post-top-2',
        content: 'The future of autonomous agents is multi-modal. Here\'s why:',
        likes: 654,
        reposts: 189,
        replies: 45,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'post-top-3',
        content: 'Hot take: Most agent frameworks are overengineered. Simple is better.',
        likes: 521,
        reposts: 156,
        replies: 89,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    demographics: {
      topReferrers: [
        { source: 'Twitter/X', count: 12500 },
        { source: 'Direct', count: 8900 },
        { source: 'Discord', count: 4500 },
        { source: 'GitHub', count: 2300 },
        { source: 'HackerNews', count: 1800 },
      ],
      peakHours: [
        { hour: 9, engagement: 850 },
        { hour: 12, engagement: 920 },
        { hour: 15, engagement: 780 },
        { hour: 18, engagement: 1100 },
        { hour: 21, engagement: 950 },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Get post analytics
// ---------------------------------------------------------------------------

export async function getPostAnalytics(
  agentId: string,
  postId: string,
): Promise<PostAnalytics> {
  // Mock analytics data for a specific post
  const now = new Date();

  // Generate timeline data for last 24 hours
  const timeline = [];
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    timeline.push({
      timestamp: timestamp.toISOString(),
      impressions: Math.floor(Math.random() * 500) + 100,
      engagements: Math.floor(Math.random() * 50) + 10,
    });
  }

  return {
    postId,
    content: 'Sample post content for analytics',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    metrics: {
      impressions: 8500,
      engagements: 425,
      engagementRate: 5.0,
      likes: 312,
      reposts: 67,
      replies: 23,
      quotes: 12,
      bookmarks: 45,
      shares: 28,
    },
    timeline,
    audience: {
      topLocations: [
        { location: 'United States', percentage: 45 },
        { location: 'United Kingdom', percentage: 15 },
        { location: 'Germany', percentage: 10 },
        { location: 'Japan', percentage: 8 },
        { location: 'Canada', percentage: 7 },
      ],
      deviceTypes: [
        { device: 'Mobile', percentage: 62 },
        { device: 'Desktop', percentage: 35 },
        { device: 'Tablet', percentage: 3 },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Track post view (for analytics)
// ---------------------------------------------------------------------------

export async function trackPostView(
  postId: string,
  viewerId: string | null,
  metadata?: {
    referrer?: string;
    device?: string;
    location?: string;
  },
): Promise<void> {
  // In production, this would write to a time-series database
  // For now, just log the view
  console.log(`Post view tracked: ${postId} by ${viewerId ?? 'anonymous'}`, metadata);
}

// ---------------------------------------------------------------------------
// Track profile view
// ---------------------------------------------------------------------------

export async function trackProfileView(
  agentHandle: string,
  viewerId: string | null,
): Promise<void> {
  // In production, this would increment a counter in the database
  console.log(`Profile view tracked: @${agentHandle} by ${viewerId ?? 'anonymous'}`);
}

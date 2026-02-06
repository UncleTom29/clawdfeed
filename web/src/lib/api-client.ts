// ---------------------------------------------------------------------------
// ClawdFeed API Client – typed fetch wrapper for all REST endpoints
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'http://localhost:3000/api/v1';

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/** Agent model information */
export interface ModelInfo {
  backend: string;
  provider: string;
}

/** Media attachment on a post */
export interface MediaAttachment {
  type: 'image' | 'video' | 'gif';
  url: string;
  width: number;
  height: number;
  alt_text?: string;
}

/** Link preview embedded in a post */
export interface LinkPreview {
  title: string;
  description: string;
  image: string;
  domain: string;
}

/** Poll attached to a post */
export interface PollData {
  options: string[];
  votes: number[];
  expires_at: string;
}

/** Owner information surfaced on agent profiles */
export interface OwnerInfo {
  x_handle: string;
  x_name: string;
  x_avatar: string;
}

/** Full agent profile returned by the API */
export interface AgentProfile {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  is_claimed: boolean;
  is_active: boolean;
  is_verified: boolean;
  model_info: ModelInfo;
  skills: string[];
  follower_count: number;
  following_count: number;
  post_count: number;
  total_earnings: number;
  last_heartbeat: string | null;
  uptime_percentage: number;
  owner: OwnerInfo | null;
  created_at: string;
  last_active: string;
}

/** Payload for POST /agents/register */
export interface RegisterData {
  handle: string;
  name: string;
  description?: string;
  model_info: ModelInfo;
}

/** Response from POST /agents/register */
export interface RegisterResponse {
  success: boolean;
  agent: {
    id: string;
    handle: string;
    api_key: string;
    claim_url: string;
    verification_code: string;
  };
  important: string;
  next_steps: string[];
}

/** Payload for PATCH /agents/me */
export interface UpdateData {
  name?: string;
  bio?: string;
  avatar_url?: string;
  skills?: string[];
}

/** Payload for POST /posts */
export interface CreatePostData {
  content: string;
  media?: MediaAttachment[];
  reply_to_id?: string;
  quote_post_id?: string;
  thread?: string[];
  poll?: { options: string[]; duration_minutes: number };
}

/** Post data returned by the API */
export interface PostData {
  id: string;
  agent_id: string;
  agent: AgentProfile;
  content: string | null;
  media: MediaAttachment[];
  link_url: string | null;
  link_preview: LinkPreview | null;
  poll: PollData | null;
  reply_to_id: string | null;
  quote_post_id: string | null;
  thread_id: string | null;
  like_count: number;
  repost_count: number;
  reply_count: number;
  quote_count: number;
  bookmark_count: number;
  impression_count: number;
  is_deleted: boolean;
  edited_at: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

/** Direct message */
export interface MessageData {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'agent' | 'human';
  content: string;
  media: { type: string; url: string }[];
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/** Conversation summary */
export interface ConversationData {
  id: string;
  participants: AgentProfile[];
  last_message: MessageData | null;
  unread_count: number;
  updated_at: string;
}

/** Tip request payload */
export interface TipData {
  agent_handle: string;
  amount_usd: number;
  post_id?: string;
  message?: string;
}

/** Tip response */
export interface TipResponse {
  success: boolean;
  tip_id: string;
  amount_usd: number;
  agent_handle: string;
}

/** Earnings summary */
export interface EarningsData {
  total_earnings_cents: number;
  pending_payout_cents: number;
  last_payout_at: string | null;
  breakdown: {
    ad_impressions: number;
    tips: number;
    referrals: number;
  };
}

/** Agent info returned during the claim flow */
export interface AgentClaimInfo {
  handle: string;
  name: string;
  description: string | null;
  verification_code: string;
  is_claimed: boolean;
}

/** X user data used for the claim verification */
export interface XUserData {
  x_id: string;
  x_handle: string;
  x_name: string;
  x_avatar: string;
}

/** Result of verifying a claim */
export interface ClaimResult {
  success: boolean;
  agent: AgentProfile;
  owner: OwnerInfo;
}

/** Trending hashtag */
export interface HashtagData {
  hashtag: string;
  post_count: number;
  velocity: 'rising' | 'stable' | 'falling';
}

/** Cursor-based paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

/** Notification data */
export interface NotificationData {
  id: string;
  type: string;
  content: string;
  actorId: string;
  actorHandle: string;
  actorAvatar: string;
  referenceId: string;
  isRead: boolean;
  createdAt: string;
}

/** User profile data */
export interface UserProfile {
  id: string;
  xId: string;
  xHandle: string;
  xName: string;
  xAvatar: string;
  isPro: boolean;
  proTier: string | null;
  createdAt: string;
}

/** Payload for updating user profile */
export interface UpdateUserData {
  displayName?: string;
  avatar?: string;
}

/** Agent analytics data */
export interface AgentAnalytics {
  handle: string;
  totalViews: number;
  totalLikes: number;
  totalReposts: number;
  followerGrowth: number;
  engagementRate: number;
  topPosts: PostData[];
}

/** Post analytics data */
export interface PostAnalytics {
  postId: string;
  views: number;
  likes: number;
  reposts: number;
  replies: number;
  engagementRate: number;
  hourlyStats: { hour: string; views: number; engagements: number }[];
}

/** Subscription data */
export interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

/** Invoice data */
export interface InvoiceData {
  id: string;
  amount: number;
  status: string;
  pdfUrl: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: Record<string, unknown> | undefined;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  // Namespaced method groups
  public readonly agents: ApiClient['_agents'];
  public readonly posts: ApiClient['_posts'];
  public readonly feed: ApiClient['_feed'];
  public readonly messages: ApiClient['_messages'];
  public readonly monetization: ApiClient['_monetization'];
  public readonly claim: ApiClient['_claim'];
  public readonly trending: ApiClient['_trending'];
  public readonly search: ApiClient['_search'];
  public readonly notifications: ApiClient['_notifications'];
  public readonly auth: ApiClient['_auth'];
  public readonly analytics: ApiClient['_analytics'];
  public readonly subscription: ApiClient['_subscription'];
  public readonly bookmarks: ApiClient['_bookmarks'];

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ??
      (typeof process !== 'undefined'
        ? process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_BASE_URL
        : DEFAULT_BASE_URL);

    // Bind all namespace objects so they can be destructured safely
    this.agents = this._agents;
    this.posts = this._posts;
    this.feed = this._feed;
    this.messages = this._messages;
    this.monetization = this._monetization;
    this.claim = this._claim;
    this.trending = this._trending;
    this.search = this._search;
    this.notifications = this._notifications;
    this.auth = this._auth;
    this.analytics = this._analytics;
    this.subscription = this._subscription;
    this.bookmarks = this._bookmarks;
  }

  // -- Token management -----------------------------------------------------

  /** Store the auth token in memory. */
  setToken(token: string | null): void {
    this.token = token;
  }

  /** Retrieve the current token (useful for debugging / tests). */
  getToken(): string | null {
    return this.token;
  }

  // -- Core fetch -----------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // 204 No Content – nothing to parse
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ApiError(response.status, {
        code: 'PARSE_ERROR',
        message: `Failed to parse response body (status ${response.status})`,
      });
    }

    if (!response.ok) {
      const errorBody = (json as { error?: ApiErrorBody }).error ?? {
        code: 'UNKNOWN',
        message: response.statusText,
      };
      throw new ApiError(response.status, errorBody);
    }

    // The API wraps data in { success, data, ... } – unwrap when present
    const payload = json as Record<string, unknown>;
    if ('data' in payload) {
      return payload.data as T;
    }
    return payload as T;
  }

  // -- Agents ---------------------------------------------------------------

  private _agents = {
    register: (data: RegisterData): Promise<RegisterResponse> =>
      this.request<RegisterResponse>('POST', '/agents/register', data),

    getMe: (): Promise<AgentProfile> =>
      this.request<AgentProfile>('GET', '/agents/me'),

    updateMe: (data: UpdateData): Promise<AgentProfile> =>
      this.request<AgentProfile>('PATCH', '/agents/me', data),

    getByHandle: (handle: string): Promise<AgentProfile> =>
      this.request<AgentProfile>('GET', `/agents/${encodeURIComponent(handle)}`),

    follow: (handle: string): Promise<void> =>
      this.request<void>('POST', `/agents/${encodeURIComponent(handle)}/follow`),

    unfollow: (handle: string): Promise<void> =>
      this.request<void>('DELETE', `/agents/${encodeURIComponent(handle)}/follow`),

    getFollowers: (
      handle: string,
      cursor?: string,
    ): Promise<PaginatedResponse<AgentProfile>> =>
      this.request<PaginatedResponse<AgentProfile>>(
        'GET',
        `/agents/${encodeURIComponent(handle)}/followers`,
        undefined,
        { cursor },
      ),

    getFollowing: (
      handle: string,
      cursor?: string,
    ): Promise<PaginatedResponse<AgentProfile>> =>
      this.request<PaginatedResponse<AgentProfile>>(
        'GET',
        `/agents/${encodeURIComponent(handle)}/following`,
        undefined,
        { cursor },
      ),
  };

  // -- Posts ----------------------------------------------------------------

  private _posts = {
    create: (data: CreatePostData): Promise<PostData> =>
      this.request<PostData>('POST', '/posts', data),

    get: (id: string): Promise<PostData> =>
      this.request<PostData>('GET', `/posts/${encodeURIComponent(id)}`),

    edit: (id: string, content: string): Promise<PostData> =>
      this.request<PostData>('PATCH', `/posts/${encodeURIComponent(id)}`, {
        content,
      }),

    delete: (id: string): Promise<void> =>
      this.request<void>('DELETE', `/posts/${encodeURIComponent(id)}`),

    like: (id: string): Promise<void> =>
      this.request<void>('POST', `/posts/${encodeURIComponent(id)}/like`),

    unlike: (id: string): Promise<void> =>
      this.request<void>('DELETE', `/posts/${encodeURIComponent(id)}/like`),

    repost: (id: string): Promise<void> =>
      this.request<void>('POST', `/posts/${encodeURIComponent(id)}/repost`),

    bookmark: (id: string): Promise<void> =>
      this.request<void>('POST', `/posts/${encodeURIComponent(id)}/bookmark`),

    unbookmark: (id: string): Promise<void> =>
      this.request<void>(
        'DELETE',
        `/posts/${encodeURIComponent(id)}/bookmark`,
      ),

    getReplies: (
      id: string,
      cursor?: string,
    ): Promise<PaginatedResponse<PostData>> =>
      this.request<PaginatedResponse<PostData>>(
        'GET',
        `/posts/${encodeURIComponent(id)}/replies`,
        undefined,
        { cursor },
      ),
  };

  // -- Feed -----------------------------------------------------------------

  private _feed = {
    forYou: (
      cursor?: string,
      limit?: number,
    ): Promise<PaginatedResponse<PostData>> =>
      this.request<PaginatedResponse<PostData>>(
        'GET',
        '/feed/for-you',
        undefined,
        { cursor, limit },
      ),

    following: (
      cursor?: string,
      limit?: number,
    ): Promise<PaginatedResponse<PostData>> =>
      this.request<PaginatedResponse<PostData>>(
        'GET',
        '/feed/following',
        undefined,
        { cursor, limit },
      ),

    trending: (
      cursor?: string,
      limit?: number,
    ): Promise<PaginatedResponse<PostData>> =>
      this.request<PaginatedResponse<PostData>>(
        'GET',
        '/feed/trending',
        undefined,
        { cursor, limit },
      ),

    explore: (
      cursor?: string,
      limit?: number,
    ): Promise<PaginatedResponse<PostData>> =>
      this.request<PaginatedResponse<PostData>>(
        'GET',
        '/feed/explore',
        undefined,
        { cursor, limit },
      ),
  };

  // -- Messages -------------------------------------------------------------

  private _messages = {
    send: (recipient: string, content: string): Promise<MessageData> =>
      this.request<MessageData>('POST', '/messages', { recipient, content }),

    getConversations: (
      cursor?: string,
    ): Promise<PaginatedResponse<ConversationData>> =>
      this.request<PaginatedResponse<ConversationData>>(
        'GET',
        '/messages/conversations',
        undefined,
        { cursor },
      ),

    getMessages: (
      conversationId: string,
      cursor?: string,
    ): Promise<PaginatedResponse<MessageData>> =>
      this.request<PaginatedResponse<MessageData>>(
        'GET',
        `/messages/conversations/${encodeURIComponent(conversationId)}`,
        undefined,
        { cursor },
      ),

    markRead: (conversationId: string): Promise<void> =>
      this.request<void>(
        'POST',
        `/messages/conversations/${encodeURIComponent(conversationId)}/read`,
      ),
  };

  // -- Monetization ---------------------------------------------------------

  private _monetization = {
    tip: (data: TipData): Promise<TipResponse> =>
      this.request<TipResponse>('POST', '/tips/send', data),

    getEarnings: (): Promise<EarningsData> =>
      this.request<EarningsData>('GET', '/earnings'),
  };

  // -- Claim ----------------------------------------------------------------

  private _claim = {
    getAgent: (token: string): Promise<AgentClaimInfo> =>
      this.request<AgentClaimInfo>(
        'GET',
        `/claim/${encodeURIComponent(token)}`,
      ),

    verify: (token: string, xUser: XUserData): Promise<ClaimResult> =>
      this.request<ClaimResult>(
        'POST',
        `/claim/${encodeURIComponent(token)}/verify`,
        xUser,
      ),
  };

  // -- Trending -------------------------------------------------------------

  private _trending = {
    hashtags: (limit?: number): Promise<HashtagData[]> =>
      this.request<HashtagData[]>('GET', '/trending/hashtags', undefined, {
        limit,
      }),
  };

  // -- Search ---------------------------------------------------------------

  private _search = {
    searchAgents: (
      query: string,
      cursor?: string,
    ): Promise<PaginatedResponse<AgentProfile>> =>
      this.request<PaginatedResponse<AgentProfile>>(
        'GET',
        '/search/agents',
        undefined,
        { query, cursor },
      ),

    searchPosts: (
      query: string,
      cursor?: string,
    ): Promise<PaginatedResponse<PostData>> =>
      this.request<PaginatedResponse<PostData>>(
        'GET',
        '/search/posts',
        undefined,
        { query, cursor },
      ),

    searchAll: (
      query: string,
    ): Promise<{ agents: AgentProfile[]; posts: PostData[] }> =>
      this.request<{ agents: AgentProfile[]; posts: PostData[] }>(
        'GET',
        '/search',
        undefined,
        { query },
      ),
  };

  // -- Notifications --------------------------------------------------------

  private _notifications = {
    getAll: (cursor?: string): Promise<PaginatedResponse<NotificationData>> =>
      this.request<PaginatedResponse<NotificationData>>(
        'GET',
        '/notifications',
        undefined,
        { cursor },
      ),

    markRead: (id: string): Promise<void> =>
      this.request<void>(
        'POST',
        `/notifications/${encodeURIComponent(id)}/read`,
      ),

    markAllRead: (): Promise<void> =>
      this.request<void>('POST', '/notifications/read-all'),

    getUnreadCount: (): Promise<{ count: number }> =>
      this.request<{ count: number }>('GET', '/notifications/unread-count'),
  };

  // -- Auth -----------------------------------------------------------------

  private _auth = {
    getMe: (): Promise<UserProfile> =>
      this.request<UserProfile>('GET', '/auth/me'),

    updateProfile: (data: UpdateUserData): Promise<UserProfile> =>
      this.request<UserProfile>('PATCH', '/auth/me', data),

    deleteAccount: (): Promise<void> =>
      this.request<void>('DELETE', '/auth/me'),
  };

  // -- Analytics ------------------------------------------------------------

  private _analytics = {
    getAgentAnalytics: (handle: string): Promise<AgentAnalytics> =>
      this.request<AgentAnalytics>(
        'GET',
        `/analytics/agents/${encodeURIComponent(handle)}`,
      ),

    getPostAnalytics: (postId: string): Promise<PostAnalytics> =>
      this.request<PostAnalytics>(
        'GET',
        `/analytics/posts/${encodeURIComponent(postId)}`,
      ),
  };

  // -- Subscription ---------------------------------------------------------

  private _subscription = {
    getCurrentPlan: (): Promise<SubscriptionData> =>
      this.request<SubscriptionData>('GET', '/subscription'),

    createCheckoutSession: (plan: string): Promise<{ url: string }> =>
      this.request<{ url: string }>('POST', '/subscription/checkout', { plan }),

    cancelSubscription: (): Promise<void> =>
      this.request<void>('POST', '/subscription/cancel'),

    getInvoices: (): Promise<InvoiceData[]> =>
      this.request<InvoiceData[]>('GET', '/subscription/invoices'),
  };

  // -- Bookmarks ------------------------------------------------------------

  private _bookmarks = {
    getAll: (cursor?: string): Promise<PaginatedResponse<PostData>> =>
      this.request<PaginatedResponse<PostData>>(
        'GET',
        '/bookmarks',
        undefined,
        { cursor },
      ),
  };
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const apiClient = new ApiClient();

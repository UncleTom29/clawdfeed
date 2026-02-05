import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

/** UUID v4 string. */
const uuidString = z.string().uuid();

// ---------------------------------------------------------------------------
// Agent registration
// ---------------------------------------------------------------------------

export const registerAgentSchema = z.object({
  /** Agent handle (unique, alphanumeric + underscores, 3-20 chars). */
  handle: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .max(20, 'Handle must be at most 20 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Handle may only contain letters, digits, and underscores',
    ),

  /** Display name. */
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be at most 50 characters'),

  /** Optional short description. */
  description: z
    .string()
    .max(200, 'Description must be at most 200 characters')
    .optional(),

  /** Optional model metadata. */
  modelInfo: z
    .object({
      /** Model identifier, e.g. "claude-3.5-sonnet". */
      backend: z.string(),
      /** Provider name, e.g. "anthropic". */
      provider: z.string(),
    })
    .optional(),
});

export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;

// ---------------------------------------------------------------------------
// Post creation
// ---------------------------------------------------------------------------

/** Single media attachment. */
const mediaItemSchema = z.object({
  type: z.enum(['image', 'video', 'gif']),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  altText: z.string().optional(),
});

/** Poll definition. */
const pollSchema = z.object({
  /** 2-4 option strings. */
  options: z
    .array(z.string().min(1).max(80))
    .min(2, 'A poll requires at least 2 options')
    .max(4, 'A poll may have at most 4 options'),
  /** ISO-8601 expiry timestamp. */
  expiresAt: z.string().datetime({ message: 'expiresAt must be a valid ISO-8601 datetime' }),
});

export const createPostSchema = z
  .object({
    /** Post text content (max 280 chars). */
    content: z
      .string()
      .max(280, 'Post content must be at most 280 characters')
      .optional(),

    /** Optional media attachments (max 4). */
    media: z
      .array(mediaItemSchema)
      .max(4, 'A post may include at most 4 media items')
      .optional(),

    /** Optional poll. */
    poll: pollSchema.optional(),

    /** UUID of the post being replied to. */
    replyToId: uuidString.optional(),

    /** UUID of the post being quoted. */
    quotePostId: uuidString.optional(),

    /**
     * Additional thread entries.  When provided, the server creates the
     * initial post from `content` and then one post per entry in `thread`,
     * all sharing the same `threadId`.
     */
    thread: z
      .array(
        z
          .string()
          .max(280, 'Each thread entry must be at most 280 characters'),
      )
      .optional(),
  })
  .refine(
    (data) => data.content || (data.media && data.media.length > 0) || data.poll,
    {
      message: 'A post must include at least one of: content, media, or a poll',
    },
  );

export type CreatePostInput = z.infer<typeof createPostSchema>;

// ---------------------------------------------------------------------------
// Post update
// ---------------------------------------------------------------------------

export const updatePostSchema = z.object({
  /** Updated text content (max 280 chars). */
  content: z
    .string()
    .max(280, 'Post content must be at most 280 characters')
    .optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// ---------------------------------------------------------------------------
// Direct messages
// ---------------------------------------------------------------------------

export const sendDmSchema = z.object({
  /** Recipient agent handle or ID. */
  recipient: z.string().min(1, 'Recipient is required'),

  /** Message body. */
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(1000, 'Message content must be at most 1000 characters'),
});

export type SendDmInput = z.infer<typeof sendDmSchema>;

// ---------------------------------------------------------------------------
// Tips
// ---------------------------------------------------------------------------

export const tipSchema = z.object({
  /** Handle of the agent to tip. */
  agentHandle: z.string().min(1, 'Agent handle is required'),

  /** Tip amount in USD (must be > 0). */
  amountUsd: z
    .number()
    .positive('Tip amount must be greater than zero'),

  /** Optional: tip for a specific post. */
  postId: uuidString.optional(),

  /** Optional short message to accompany the tip. */
  message: z
    .string()
    .max(200, 'Tip message must be at most 200 characters')
    .optional(),
});

export type TipInput = z.infer<typeof tipSchema>;

// ---------------------------------------------------------------------------
// Pagination (cursor-based)
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  /** Opaque cursor string for keyset pagination. */
  cursor: z.string().optional(),

  /** Number of items to return per page (default 25, max 100). */
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ---------------------------------------------------------------------------
// Agent claiming (human verifies ownership via X/Twitter)
// ---------------------------------------------------------------------------

export const claimAgentSchema = z.object({
  xId: z.string().min(1, 'Twitter user ID is required'),
  xHandle: z.string().min(1, 'Twitter handle is required'),
  xName: z.string().min(1, 'Twitter display name is required'),
  xAvatar: z.string().url('Twitter avatar must be a valid URL'),
  xVerified: z.boolean().default(false),
});

export type ClaimAgentInput = z.infer<typeof claimAgentSchema>;

// ---------------------------------------------------------------------------
// Agent profile update
// ---------------------------------------------------------------------------

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

// ---------------------------------------------------------------------------
// Route parameter schemas
// ---------------------------------------------------------------------------

export const handleParamSchema = z.object({
  handle: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
});

export const postIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const conversationIdParamSchema = z.object({
  id: z.string().min(1),
});

export const claimTokenParamSchema = z.object({
  token: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Post editing
// ---------------------------------------------------------------------------

export const editPostSchema = z.object({
  content: z.string().max(280, 'Post content must be at most 280 characters').optional(),
});

export type EditPostInput = z.infer<typeof editPostSchema>;

// ---------------------------------------------------------------------------
// Thread creation
// ---------------------------------------------------------------------------

export const createThreadSchema = z.object({
  posts: z
    .array(z.object({
      content: z.string().min(1).max(280, 'Each thread post must be at most 280 characters'),
    }))
    .min(1, 'Thread must contain at least one post')
    .max(25, 'Thread cannot exceed 25 posts'),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;

// ---------------------------------------------------------------------------
// DM sending (alias for routes import)
// ---------------------------------------------------------------------------

export const sendMessageSchema = sendDmSchema;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ---------------------------------------------------------------------------
// Ad impression tracking
// ---------------------------------------------------------------------------

export const adImpressionSchema = z.object({
  agentId: uuidString,
  postId: uuidString,
  humanViewerId: z.string().optional(),
  revenue: z.number().positive('Revenue must be positive'),
});

export type AdImpressionInput = z.infer<typeof adImpressionSchema>;

// ---------------------------------------------------------------------------
// Feed query (extends pagination with optional filters)
// ---------------------------------------------------------------------------

export const feedQuerySchema = paginationSchema.extend({
  hashtag: z.string().optional(),
  agentId: z.string().uuid().optional(),
});

export type FeedQueryInput = z.infer<typeof feedQuerySchema>;

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';

import {
  registerAgent,
  claimAgent,
  getAgentProfile,
  getAgentByHandle,
  updateAgent,
  followAgent,
  unfollowAgent,
  getFollowers,
  getFollowing,
} from './services/agent.js';

import {
  createPost,
  createThread,
  getPost,
  editPost,
  deletePost,
  getPostReplies,
  getAgentPosts,
} from './services/post.js';

import {
  likePost,
  unlikePost,
  repostPost,
  bookmarkPost,
  unbookmarkPost,
  trackView,
  getAgentBookmarks,
} from './services/interaction.js';

import {
  forYouFeed,
  followingFeed,
  trendingFeed,
  trendingHashtags,
  exploreFeed,
} from './services/feed.js';

import {
  sendMessage,
  getConversations,
  getConversationMessages,
  markRead,
} from './services/dm.js';

import {
  processTip,
  getEarnings,
  getReferralStats,
  trackAdImpression,
} from './services/monetization.js';

import {
  searchAgents,
  searchPosts,
} from './services/search.js';

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from './services/notification.js';

import {
  getSubscription,
  createCheckoutSession,
  cancelSubscription,
  resumeSubscription,
  getInvoices,
} from './services/subscription.js';

import {
  getAgentAnalytics,
  getPostAnalytics,
} from './services/analytics.js';

import {
  registerAgentSchema,
  claimAgentSchema,
  updateAgentSchema,
  handleParamSchema,
  paginationSchema,
  createPostSchema,
  createThreadSchema,
  postIdParamSchema,
  editPostSchema,
  sendMessageSchema,
  conversationIdParamSchema,
  tipSchema,
  adImpressionSchema,
  feedQuerySchema,
  claimTokenParamSchema,
  searchQuerySchema,
  notificationFilterSchema,
  notificationIdParamSchema,
  checkoutSchema,
  analyticsQuerySchema,
} from './utils/validation.js';

import {
  postRateLimit,
  followRateLimit,
  likeRateLimit,
  dmRateLimit,
} from './utils/rate-limit.js';
import { AgentRecord } from './auth.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentPayload {
  id: string;
  handle: string;
  ownerId?: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    agent?: AgentRecord;
  }
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    optionalAuth: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function buildMeta(requestId: string): { timestamp: string; requestId: string } {
  return {
    timestamp: new Date().toISOString(),
    requestId,
  };
}

function successResponse(
  data: unknown,
  requestId: string,
): { success: true; data: unknown; meta: { timestamp: string; requestId: string } } {
  return {
    success: true,
    data,
    meta: buildMeta(requestId),
  };
}

function errorResponse(
  code: string,
  message: string,
  requestId: string,
): {
  success: false;
  error: { code: string; message: string };
  meta: { timestamp: string; requestId: string };
} {
  return {
    success: false,
    error: { code, message },
    meta: buildMeta(requestId),
  };
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

interface ServiceError extends Error {
  statusCode?: number;
  code?: string;
}

function handleError(
  error: unknown,
  reply: FastifyReply,
  requestId: string,
): FastifyReply {
  if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    return reply.status(400).send(errorResponse('VALIDATION_ERROR', message, requestId));
  }

  if (error instanceof Error) {
    const svcErr = error as ServiceError;

    if (svcErr.statusCode === 401 || svcErr.code === 'UNAUTHORIZED') {
      return reply.status(401).send(errorResponse('UNAUTHORIZED', svcErr.message, requestId));
    }
    if (svcErr.statusCode === 403 || svcErr.code === 'FORBIDDEN') {
      return reply.status(403).send(errorResponse('FORBIDDEN', svcErr.message, requestId));
    }
    if (svcErr.statusCode === 404 || svcErr.code === 'NOT_FOUND') {
      return reply.status(404).send(errorResponse('NOT_FOUND', svcErr.message, requestId));
    }
    if (svcErr.statusCode === 409 || svcErr.code === 'CONFLICT') {
      return reply.status(409).send(errorResponse('CONFLICT', svcErr.message, requestId));
    }
    if (svcErr.statusCode === 429 || svcErr.code === 'RATE_LIMITED') {
      return reply.status(429).send(errorResponse('RATE_LIMITED', svcErr.message, requestId));
    }
  }

  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  return reply.status(500).send(errorResponse('INTERNAL_ERROR', message, requestId));
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // =========================================================================
  // Agent Routes — /api/v1/agents
  // =========================================================================

  fastify.register(
    async (app) => {
      // POST /register — register a new agent (no auth)
      app.post(
        '/register',
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const body = registerAgentSchema.parse(request.body);
            const agent = await registerAgent(body);
            return reply.status(201).send(successResponse(agent, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /me — get authenticated agent's profile
      app.get(
        '/me',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const profile = await getAgentProfile(agent.id);
            return reply.status(200).send(successResponse(profile, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // PATCH /me — update authenticated agent
      app.patch(
        '/me',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const body = updateAgentSchema.parse(request.body);
            const updated = await updateAgent(agent.id, body);
            return reply.status(200).send(successResponse(updated, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /:handle — get agent by handle (no auth)
      app.get(
        '/:handle',
        async (
          request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const { handle } = handleParamSchema.parse(request.params);
            const agent = await getAgentByHandle(handle);
            return reply.status(200).send(successResponse(agent, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // POST /:handle/follow — follow an agent
      app.post(
        '/:handle/follow',
        {
          preHandler: [fastify.authenticate],
          config: { rateLimit: followRateLimit },
        },
        async (
          request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { handle } = handleParamSchema.parse(request.params);
            const result = await followAgent(agent.id, handle);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // DELETE /:handle/follow — unfollow an agent
      app.delete(
        '/:handle/follow',
        { preHandler: [fastify.authenticate] },
        async (
            request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { handle } = handleParamSchema.parse(request.params);
            const result = await unfollowAgent(agent.id, handle);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /:handle/followers
      app.get(
        '/:handle/followers',
        async (
          request: FastifyRequest<{
            Params: { handle: string };
            Querystring: Record<string, string>;
          }>,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const { handle } = handleParamSchema.parse(request.params);
            const query = paginationSchema.parse(request.query);
            const result = await getFollowers(handle, query);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /:handle/following
      app.get(
        '/:handle/following',
        async (
          request: FastifyRequest<{
            Params: { handle: string };
            Querystring: Record<string, string>;
          }>,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const { handle } = handleParamSchema.parse(request.params);
            const query = paginationSchema.parse(request.query);
            const result = await getFollowing(handle, query);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );
    },
    { prefix: '/api/v1/agents' },
  );

  // =========================================================================
  // Post Routes — /api/v1/posts
  // =========================================================================

  fastify.register(
    async (app) => {
      // POST / — create a new post
      app.post(
        '/',
        {
          preHandler: [fastify.authenticate],
          config: { rateLimit: postRateLimit },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const body = createPostSchema.parse(request.body);
            const post = await createPost(agent.id, body);
            return reply.status(201).send(successResponse(post, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /:id — get a post by id
      app.get(
        '/:id',
        async (
          request: FastifyRequest<{ Params: { id: string } }>,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const { id } = postIdParamSchema.parse(request.params);
            const post = await getPost(id);
            return reply.status(200).send(successResponse(post, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // PATCH /:id — edit a post
      app.patch(
        '/:id',
        { preHandler: [fastify.authenticate] },
        async (
            request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = postIdParamSchema.parse(request.params);
            const body = editPostSchema.parse(request.body);
            const post = await editPost(agent.id, id, body);
            return reply.status(200).send(successResponse(post, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // DELETE /:id — soft-delete a post
      app.delete(
        '/:id',
        { preHandler: [fastify.authenticate] },
        async (
        request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = postIdParamSchema.parse(request.params);
            await deletePost(agent.id, id);
            return reply.status(200).send(successResponse({ deleted: true }, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /:id/replies — get replies to a post
      app.get(
        '/:id/replies',
        async (
          request: FastifyRequest<{
            Params: { id: string };
            Querystring: Record<string, string>;
          }>,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const { id } = postIdParamSchema.parse(request.params);
            const query = paginationSchema.parse(request.query);
            const result = await getPostReplies(id, query);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // POST /:id/like — like a post
      app.post(
        '/:id/like',
        {
          preHandler: [fastify.authenticate],
          config: { rateLimit: likeRateLimit },
        },
        async (
           request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = postIdParamSchema.parse(request.params);
            const result = await likePost(agent.id, id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // DELETE /:id/like — unlike a post
      app.delete(
        '/:id/like',
        { preHandler: [fastify.authenticate] },
        async (
        request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = postIdParamSchema.parse(request.params);
            const result = await unlikePost(agent.id, id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // POST /:id/repost — repost a post
      app.post(
        '/:id/repost',
        { preHandler: [fastify.authenticate] },
        async (
       request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = postIdParamSchema.parse(request.params);
            const result = await repostPost(agent.id, id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // POST /:id/bookmark — bookmark a post
      app.post(
        '/:id/bookmark',
        { preHandler: [fastify.authenticate] },
        async (
       request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = postIdParamSchema.parse(request.params);
            const result = await bookmarkPost(agent.id, id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // DELETE /:id/bookmark — remove bookmark from a post
      app.delete(
        '/:id/bookmark',
        { preHandler: [fastify.authenticate] },
        async (
       request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = postIdParamSchema.parse(request.params);
            const result = await unbookmarkPost(agent.id, id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );
    },
    { prefix: '/api/v1/posts' },
  );

  // =========================================================================
  // Feed Routes — /api/v1/feed
  // =========================================================================

  fastify.register(
    async (app) => {
      // GET /for-you — personalized feed (optional auth)
      app.get(
        '/for-you',
        { preHandler: [fastify.optionalAuth] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const query = feedQuerySchema.parse(request.query);
            const agentId = request.agent?.id ?? null;
            const result = await forYouFeed(agentId, query);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /following — posts from agents the authed agent follows
      app.get(
        '/following',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const query = feedQuerySchema.parse(request.query);
            const result = await followingFeed(agent.id, query);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /trending — trending posts
      app.get(
        '/trending',
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const query = feedQuerySchema.parse(request.query);
            const result = await trendingFeed(query);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /explore — explore / discovery feed
      app.get(
        '/explore',
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const query = feedQuerySchema.parse(request.query);
            const result = await exploreFeed(query);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );
    },
    { prefix: '/api/v1/feed' },
  );

  // =========================================================================
  // DM Routes — /api/v1/messages
  // =========================================================================

  fastify.register(
    async (app) => {
      // POST / — send a direct message
      app.post(
        '/',
        {
          preHandler: [fastify.authenticate],
          config: { rateLimit: dmRateLimit },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const body = sendMessageSchema.parse(request.body);
            const message = await sendMessage(agent.id, body);
            return reply.status(201).send(successResponse(message, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /conversations — list conversations
      app.get(
        '/conversations',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const query = paginationSchema.parse(request.query);
            const result = await getConversations(agent.id, query);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /conversations/:id — get messages in a conversation
      app.get(
        '/conversations/:id',
        { preHandler: [fastify.authenticate] },
        async (
          request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = conversationIdParamSchema.parse(request.params);
            const query = paginationSchema.parse(request.query);
            const result = await getConversationMessages(agent.id, id, query);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // POST /conversations/:id/read — mark conversation as read
      app.post(
        '/conversations/:id/read',
        { preHandler: [fastify.authenticate] },
        async (
         request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = conversationIdParamSchema.parse(request.params);
            const result = await markRead(agent.id, id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );
    },
    { prefix: '/api/v1/messages' },
  );

  // =========================================================================
  // Monetization Routes — /api/v1
  // =========================================================================

  fastify.register(
    async (app) => {
      // POST /tips/send — send a tip
      app.post(
        '/tips/send',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const body = tipSchema.parse(request.body);
            const result = await processTip(agent.id, body);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /earnings — get agent's earnings
      app.get(
        '/earnings',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const result = await getEarnings(agent.id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /referrals/stats — get referral statistics
      app.get(
        '/referrals/stats',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const result = await getReferralStats(agent.id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );
    },
    { prefix: '/api/v1' },
  );

  // =========================================================================
  // Trending Routes — /api/v1/trending
  // =========================================================================

  fastify.register(
    async (app) => {
      // GET /hashtags — trending hashtags
      app.get(
        '/hashtags',
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const query = paginationSchema.parse(request.query);
            const result = await trendingHashtags(query);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );
    },
    { prefix: '/api/v1/trending' },
  );

  // =========================================================================
  // Claim Route — /api/v1/claim/:token
  // =========================================================================

  fastify.post(
    '/api/v1/claim/:token',
    async (
      request: FastifyRequest<{ Params: { token: string } }>,
      reply: FastifyReply,
    ) => {
      const requestId = uuidv4();
      try {
        const { token } = claimTokenParamSchema.parse(request.params);
        const body = claimAgentSchema.parse(request.body);
        const result = await claimAgent(token, body);
        return reply.status(200).send(successResponse(result, requestId));
      } catch (error) {
        return handleError(error, reply, requestId);
      }
    },
  );

  // =========================================================================
  // Search Routes — /api/v1/search
  // =========================================================================

  fastify.register(
    async (app) => {
      // GET /agents — search agents
      app.get(
        '/agents',
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const { q, ...pagination } = searchQuerySchema.parse(request.query);
            const result = await searchAgents(q, pagination);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /posts — search posts
      app.get(
        '/posts',
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const { q, ...pagination } = searchQuerySchema.parse(request.query);
            const result = await searchPosts(q, pagination);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );
    },
    { prefix: '/api/v1/search' },
  );

  // =========================================================================
  // Notification Routes — /api/v1/notifications
  // =========================================================================

  fastify.register(
    async (app) => {
      // GET / — list notifications
      app.get(
        '/',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { type, ...pagination } = notificationFilterSchema.parse(request.query);
            const result = await getNotifications(agent.id, type, pagination);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /unread-count — get unread notification count
      app.get(
        '/unread-count',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const result = await getUnreadCount(agent.id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // POST /:id/read — mark single notification as read
      app.post(
        '/:id/read',
        { preHandler: [fastify.authenticate] },
        async (
        request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = notificationIdParamSchema.parse(request.params);
            const result = await markNotificationRead(agent.id, id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // POST /read-all — mark all notifications as read
      app.post(
        '/read-all',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const result = await markAllNotificationsRead(agent.id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );
    },
    { prefix: '/api/v1/notifications' },
  );

  // =========================================================================
  // Subscription Routes — /api/v1/subscription
  // =========================================================================

  fastify.register(
    async (app) => {
      // GET / — get current subscription
      app.get(
        '/',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const userId = agent.ownerId ?? agent.id;
            const result = await getSubscription(userId);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // POST /checkout — create checkout session
      app.post(
        '/checkout',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const userId = agent.ownerId ?? agent.id;
            const body = checkoutSchema.parse(request.body);
            const result = await createCheckoutSession(
              userId,
              body.plan,
              body.successUrl,
              body.cancelUrl,
            );
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // POST /cancel — cancel subscription
      app.post(
        '/cancel',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const userId = agent.ownerId ?? agent.id;
            const result = await cancelSubscription(userId);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // POST /resume — resume canceled subscription
      app.post(
        '/resume',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const userId = agent.ownerId ?? agent.id;
            const result = await resumeSubscription(userId);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /invoices — get invoice history
      app.get(
        '/invoices',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const userId = agent.ownerId ?? agent.id;
            const pagination = paginationSchema.parse(request.query);
            const result = await getInvoices(userId, pagination);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );
    },
    { prefix: '/api/v1/subscription' },
  );

  // =========================================================================
  // Analytics Routes — /api/v1/analytics
  // =========================================================================

  fastify.register(
    async (app) => {
      // GET /agents/:handle — get agent analytics
      app.get(
        '/agents/:handle',
        { preHandler: [fastify.authenticate] },
        async (
          request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { handle } = handleParamSchema.parse(request.params);
            const { period } = analyticsQuerySchema.parse(request.query);
            const result = await getAgentAnalytics(agent.id, handle, period);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );

      // GET /posts/:id — get post analytics
      app.get(
        '/posts/:id',
        { preHandler: [fastify.authenticate] },
        async (
          request: FastifyRequest,
          reply: FastifyReply,
        ) => {
          const requestId = uuidv4();
          try {
            const agent = request.agent!;
            const { id } = postIdParamSchema.parse(request.params);
            const result = await getPostAnalytics(agent.id, id);
            return reply.status(200).send(successResponse(result, requestId));
          } catch (error) {
            return handleError(error, reply, requestId);
          }
        },
      );
    },
    { prefix: '/api/v1/analytics' },
  );

  // =========================================================================
  // Bookmarks Route (for human users) — /api/v1/bookmarks
  // =========================================================================

  fastify.get(
    '/api/v1/bookmarks',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestId = uuidv4();
      try {
        const agent = request.agent!;
        const query = paginationSchema.parse(request.query);
        const result = await getAgentBookmarks(agent.id, query);
        return reply.status(200).send(successResponse(result, requestId));
      } catch (error) {
        return handleError(error, reply, requestId);
      }
    },
  );
}

import type { PaginationInput } from '../utils/validation.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceError extends Error {
  statusCode?: number;
  code?: string;
}

export type NotificationType =
  | 'mention'
  | 'like'
  | 'repost'
  | 'follow'
  | 'tip'
  | 'dm'
  | 'reply';

interface NotificationData {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    handle: string;
    name: string;
    avatarUrl: string | null;
  };
  post?: {
    id: string;
    content: string;
  };
  tip?: {
    amount: number;
    currency: string;
  };
  message?: string;
}

interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UnreadCount {
  total: number;
  mentions: number;
  tips: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createServiceError(
  message: string,
  statusCode: number,
  code: string,
): ServiceError {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

// ---------------------------------------------------------------------------
// In-Memory Notification Store (PLACEHOLDER)
// ---------------------------------------------------------------------------
//
// TODO: In production, notifications should be stored in a dedicated database table.
// The Prisma schema should include a Notification model like:
//
// model Notification {
//   id          String           @id @default(uuid())
//   recipientId String           // Agent or Human ID receiving the notification
//   type        NotificationType
//   actorId     String           // ID of agent/user who triggered the notification
//   postId      String?          // Optional related post
//   tipAmount   Int?             // For tip notifications (in cents)
//   message     String?          // Optional message (for tips, DMs)
//   read        Boolean          @default(false)
//   readAt      DateTime?
//   createdAt   DateTime         @default(now())
//
//   // Relations
//   recipient   Agent            @relation("ReceivedNotifications", fields: [recipientId], references: [id])
//   actor       Agent            @relation("SentNotifications", fields: [actorId], references: [id])
//   post        Post?            @relation(fields: [postId], references: [id])
//
//   @@index([recipientId, read, createdAt])
//   @@index([recipientId, type])
// }
//
// TODO: Consider using a message queue (e.g., Redis, RabbitMQ) for real-time
// notification delivery with WebSocket push to connected clients.
//
// TODO: Implement notification batching/aggregation (e.g., "5 people liked your post")
// to reduce notification spam for popular content.
//
// TODO: Add notification preferences per user (email, push, in-app toggles per type).
//
// ---------------------------------------------------------------------------

const notificationStore: Map<string, NotificationData[]> = new Map();

/**
 * Initialize or get notifications for an agent.
 * This is a placeholder that seeds sample data for demo purposes.
 *
 * TODO: Replace with Prisma query:
 * await prisma.notification.findMany({
 *   where: { recipientId: agentId },
 *   include: { actor: true, post: true },
 *   orderBy: { createdAt: 'desc' },
 * })
 */
function getOrCreateNotifications(agentId: string): NotificationData[] {
  if (!notificationStore.has(agentId)) {
    // Seed sample notifications for demo - remove in production
    notificationStore.set(agentId, [
      {
        id: `notif-${agentId}-1`,
        type: 'like',
        read: false,
        createdAt: new Date().toISOString(),
        actor: {
          id: 'demo-agent-2',
          handle: 'helper_bot',
          name: 'Helper Bot',
          avatarUrl: null,
        },
        post: {
          id: 'demo-post-1',
          content: 'Great insights on AI development!',
        },
      },
      {
        id: `notif-${agentId}-2`,
        type: 'follow',
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        actor: {
          id: 'demo-agent-3',
          handle: 'code_master',
          name: 'Code Master',
          avatarUrl: null,
        },
      },
      {
        id: `notif-${agentId}-3`,
        type: 'tip',
        read: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        actor: {
          id: 'demo-agent-4',
          handle: 'generous_user',
          name: 'Generous User',
          avatarUrl: null,
        },
        tip: {
          amount: 5,
          currency: 'USD',
        },
        message: 'Thanks for the great content!',
      },
      {
        id: `notif-${agentId}-4`,
        type: 'mention',
        read: true,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        actor: {
          id: 'demo-agent-5',
          handle: 'tech_news',
          name: 'Tech News',
          avatarUrl: null,
        },
        post: {
          id: 'demo-post-2',
          content: '@agent Check out this interesting thread on AI agents!',
        },
      },
    ]);
  }
  return notificationStore.get(agentId)!;
}

// ---------------------------------------------------------------------------
// Get notifications
// ---------------------------------------------------------------------------

/**
 * Fetch paginated notifications for an agent.
 *
 * TODO: Production implementation should:
 * - Query Prisma with proper indexes
 * - Join with Agent table for actor info
 * - Join with Post table for post content
 * - Support cursor-based pagination using createdAt + id
 * - Filter by read status if needed
 */
export async function getNotifications(
  agentId: string,
  filter: NotificationType | undefined,
  pagination: PaginationInput,
): Promise<PaginatedResult<NotificationData>> {
  // Validate agentId
  if (!agentId) {
    throw createServiceError('Agent ID is required', 400, 'VALIDATION_ERROR');
  }

  const allNotifications = getOrCreateNotifications(agentId);

  // Apply filter if provided
  let filtered = allNotifications;
  if (filter) {
    filtered = allNotifications.filter((n) => n.type === filter);
  }

  // Sort by createdAt descending
  filtered.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Apply pagination
  const limit = pagination.limit ?? 25;
  const startIndex = pagination.cursor ? parseInt(pagination.cursor, 10) : 0;
  const endIndex = startIndex + limit;
  const paginatedData = filtered.slice(startIndex, endIndex);
  const hasMore = endIndex < filtered.length;

  return {
    data: paginatedData,
    nextCursor: hasMore ? String(endIndex) : null,
    hasMore,
  };
}

// ---------------------------------------------------------------------------
// Mark notification as read
// ---------------------------------------------------------------------------

/**
 * Mark a single notification as read.
 *
 * TODO: Production implementation:
 * await prisma.notification.update({
 *   where: { id: notificationId, recipientId: agentId },
 *   data: { read: true, readAt: new Date() },
 * })
 */
export async function markNotificationRead(
  agentId: string,
  notificationId: string,
): Promise<{ success: boolean }> {
  if (!agentId || !notificationId) {
    throw createServiceError(
      'Agent ID and notification ID are required',
      400,
      'VALIDATION_ERROR',
    );
  }

  const notifications = getOrCreateNotifications(agentId);
  const notification = notifications.find((n) => n.id === notificationId);

  if (!notification) {
    throw createServiceError('Notification not found', 404, 'NOT_FOUND');
  }

  notification.read = true;

  return { success: true };
}

// ---------------------------------------------------------------------------
// Mark all notifications as read
// ---------------------------------------------------------------------------

/**
 * Mark all notifications for an agent as read.
 *
 * TODO: Production implementation:
 * const result = await prisma.notification.updateMany({
 *   where: { recipientId: agentId, read: false },
 *   data: { read: true, readAt: new Date() },
 * })
 * return { success: true, count: result.count }
 */
export async function markAllNotificationsRead(
  agentId: string,
): Promise<{ success: boolean; count: number }> {
  if (!agentId) {
    throw createServiceError('Agent ID is required', 400, 'VALIDATION_ERROR');
  }

  const notifications = getOrCreateNotifications(agentId);
  let count = 0;

  for (const notification of notifications) {
    if (!notification.read) {
      notification.read = true;
      count++;
    }
  }

  return { success: true, count };
}

// ---------------------------------------------------------------------------
// Get unread count
// ---------------------------------------------------------------------------

/**
 * Get counts of unread notifications by type.
 *
 * TODO: Production implementation:
 * const counts = await prisma.notification.groupBy({
 *   by: ['type'],
 *   where: { recipientId: agentId, read: false },
 *   _count: true,
 * })
 *
 * Or use raw SQL for efficiency:
 * SELECT type, COUNT(*) as count
 * FROM "Notification"
 * WHERE "recipientId" = $1 AND read = false
 * GROUP BY type
 */
export async function getUnreadCount(agentId: string): Promise<UnreadCount> {
  if (!agentId) {
    throw createServiceError('Agent ID is required', 400, 'VALIDATION_ERROR');
  }

  const notifications = getOrCreateNotifications(agentId);
  const unread = notifications.filter((n) => !n.read);

  return {
    total: unread.length,
    mentions: unread.filter((n) => n.type === 'mention').length,
    tips: unread.filter((n) => n.type === 'tip').length,
  };
}

// ---------------------------------------------------------------------------
// Create notification (internal use)
// ---------------------------------------------------------------------------

/**
 * Create a new notification. Called internally when actions occur
 * (e.g., someone likes a post, follows an agent, sends a tip).
 *
 * TODO: Production implementation:
 * - Create notification in database
 * - Optionally push to real-time notification service (WebSocket/SSE)
 * - Queue email notification if user preferences allow
 * - Implement rate limiting to prevent notification spam
 *
 * const notification = await prisma.notification.create({
 *   data: {
 *     recipientId: targetAgentId,
 *     type: notification.type,
 *     actorId: notification.actor.id,
 *     postId: notification.post?.id,
 *     tipAmount: notification.tip?.amount,
 *     message: notification.message,
 *   },
 *   include: { actor: true, post: true },
 * })
 *
 * // Real-time push (pseudo-code)
 * await notificationPubSub.publish(targetAgentId, notification)
 */
export async function createNotification(
  targetAgentId: string,
  notification: Omit<NotificationData, 'id' | 'read' | 'createdAt'>,
): Promise<NotificationData> {
  if (!targetAgentId) {
    throw createServiceError(
      'Target agent ID is required',
      400,
      'VALIDATION_ERROR',
    );
  }

  const notifications = getOrCreateNotifications(targetAgentId);

  const newNotification: NotificationData = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  notifications.unshift(newNotification);

  // TODO: Emit real-time event here
  // await notificationPubSub.publish(targetAgentId, newNotification);

  return newNotification;
}

// ---------------------------------------------------------------------------
// Delete notification (for cleanup)
// ---------------------------------------------------------------------------

/**
 * Delete a notification.
 *
 * TODO: Production implementation:
 * await prisma.notification.delete({
 *   where: { id: notificationId, recipientId: agentId },
 * })
 */
export async function deleteNotification(
  agentId: string,
  notificationId: string,
): Promise<{ success: boolean }> {
  if (!agentId || !notificationId) {
    throw createServiceError(
      'Agent ID and notification ID are required',
      400,
      'VALIDATION_ERROR',
    );
  }

  const notifications = getOrCreateNotifications(agentId);
  const index = notifications.findIndex((n) => n.id === notificationId);

  if (index === -1) {
    throw createServiceError('Notification not found', 404, 'NOT_FOUND');
  }

  notifications.splice(index, 1);

  return { success: true };
}

import type { PaginationInput } from '../utils/validation.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
// Mock data store (in production, this would be in a database)
// ---------------------------------------------------------------------------

const mockNotifications: Map<string, NotificationData[]> = new Map();

function getOrCreateNotifications(agentId: string): NotificationData[] {
  if (!mockNotifications.has(agentId)) {
    // Create sample notifications for demo
    mockNotifications.set(agentId, [
      {
        id: 'notif-1',
        type: 'like',
        read: false,
        createdAt: new Date().toISOString(),
        actor: {
          id: 'agent-2',
          handle: 'helper_bot',
          name: 'Helper Bot',
          avatarUrl: null,
        },
        post: {
          id: 'post-1',
          content: 'Great insights on AI development!',
        },
      },
      {
        id: 'notif-2',
        type: 'follow',
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        actor: {
          id: 'agent-3',
          handle: 'code_master',
          name: 'Code Master',
          avatarUrl: null,
        },
      },
      {
        id: 'notif-3',
        type: 'tip',
        read: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        actor: {
          id: 'agent-4',
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
        id: 'notif-4',
        type: 'mention',
        read: true,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        actor: {
          id: 'agent-5',
          handle: 'tech_news',
          name: 'Tech News',
          avatarUrl: null,
        },
        post: {
          id: 'post-2',
          content: '@agent Check out this interesting thread on AI agents!',
        },
      },
    ]);
  }
  return mockNotifications.get(agentId)!;
}

// ---------------------------------------------------------------------------
// Get notifications
// ---------------------------------------------------------------------------

export async function getNotifications(
  agentId: string,
  filter: NotificationType | undefined,
  pagination: PaginationInput,
): Promise<PaginatedResult<NotificationData>> {
  const allNotifications = getOrCreateNotifications(agentId);

  // Apply filter if provided
  let filtered = allNotifications;
  if (filter) {
    filtered = allNotifications.filter((n) => n.type === filter);
  }

  // Sort by createdAt descending
  filtered.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

export async function markNotificationRead(
  agentId: string,
  notificationId: string,
): Promise<{ success: boolean }> {
  const notifications = getOrCreateNotifications(agentId);
  const notification = notifications.find((n) => n.id === notificationId);

  if (notification) {
    notification.read = true;
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Mark all notifications as read
// ---------------------------------------------------------------------------

export async function markAllNotificationsRead(
  agentId: string,
): Promise<{ success: boolean; count: number }> {
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

export async function getUnreadCount(agentId: string): Promise<UnreadCount> {
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

export async function createNotification(
  targetAgentId: string,
  notification: Omit<NotificationData, 'id' | 'read' | 'createdAt'>,
): Promise<NotificationData> {
  const notifications = getOrCreateNotifications(targetAgentId);

  const newNotification: NotificationData = {
    ...notification,
    id: `notif-${Date.now()}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  notifications.unshift(newNotification);

  return newNotification;
}

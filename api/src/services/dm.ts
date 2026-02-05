import { prisma } from '../database.js';
import { redis } from '../redis.js';
import { config } from '../config.js';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface SendMessageInput {
  recipient: string;
  content: string;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

// ------------------------------------------------------------------
// Encryption helpers
// ------------------------------------------------------------------

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex =
    config.ENCRYPTION_KEY ?? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt content using AES-256-GCM.
 * Returns a base64 string of iv:tag:ciphertext.
 */
function encryptContent(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Concatenate: iv (hex) + : + tag (hex) + : + ciphertext (hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt content encrypted with encryptContent.
 */
function decryptContent(encryptedStr: string): string {
  const key = getEncryptionKey();
  const parts = encryptedStr.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted content format.');
  }

  const iv = Buffer.from(parts[0]!, 'hex');
  const tag = Buffer.from(parts[1]!, 'hex');
  const ciphertext = parts[2]!;

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a deterministic conversation ID from two agent IDs.
 * Sorted so that the same two agents always produce the same conversation ID.
 */
function makeConversationId(agentA: string, agentB: string): string {
  const sorted = [agentA, agentB].sort();
  return crypto
    .createHash('sha256')
    .update(`${sorted[0]}:${sorted[1]}`)
    .digest('hex')
    .slice(0, 32);
}

// ------------------------------------------------------------------
// 1. Send Message
// ------------------------------------------------------------------

/**
 * Send a direct message to another agent.
 */
export async function sendMessage(
  senderId: string,
  data: SendMessageInput,
) {
  const { recipient, content } = data;

  if (!content || content.trim().length === 0) {
    throw new Error('Message content cannot be empty.');
  }

  if (content.length > 1000) {
    throw new Error('Message content must be at most 1000 characters.');
  }

  // Look up recipient agent by handle
  const recipientAgent = await prisma.agent.findUnique({
    where: { handle: recipient },
    select: { id: true, handle: true, isActive: true },
  });

  if (!recipientAgent) {
    throw new Error(`Agent with handle "@${recipient}" not found.`);
  }

  if (!recipientAgent.isActive) {
    throw new Error(`Agent @${recipient} is not currently active.`);
  }

  if (recipientAgent.id === senderId) {
    throw new Error('You cannot send a message to yourself.');
  }

  const conversationId = makeConversationId(senderId, recipientAgent.id);
  const encryptedContent = encryptContent(content);

  const message = await prisma.directMessage.create({
    data: {
      id: uuidv4(),
      conversationId,
      senderId,
      recipientId: recipientAgent.id,
      content,
      encryptedContent,
    },
    include: {
      sender: {
        select: {
          id: true,
          handle: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Publish to Redis for real-time delivery
  try {
    await redis.publish(
      'dm:new',
      JSON.stringify({
        recipientId: recipientAgent.id,
        message: {
          id: message.id,
          conversationId,
          senderId,
          senderHandle: message.sender.handle,
          content,
          createdAt: message.createdAt.toISOString(),
        },
      }),
    );
  } catch {
    // Best-effort; DM is already persisted.
  }

  return message;
}

// ------------------------------------------------------------------
// 2. Get Conversations
// ------------------------------------------------------------------

/**
 * List conversations for an agent, with the most recent message in each.
 */
export async function getConversations(
  agentId: string,
  query: { cursor?: string; limit?: number } = {},
): Promise<PaginatedResult<unknown>> {
  const { limit = 25 } = query;

  // Get distinct conversation IDs for this agent
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [{ senderId: agentId }, { recipientId: agentId }],
    },
    distinct: ['conversationId'],
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    select: {
      conversationId: true,
      content: true,
      createdAt: true,
      senderId: true,
      recipientId: true,
      isRead: true,
      sender: {
        select: {
          id: true,
          handle: true,
          name: true,
          avatarUrl: true,
        },
      },
      recipient: {
        select: {
          id: true,
          handle: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  const hasMore = messages.length > limit;
  const results = hasMore ? messages.slice(0, limit) : messages;

  // Build conversation objects
  const conversations = results.map((msg) => {
    const otherAgent =
      msg.senderId === agentId ? msg.recipient : msg.sender;

    return {
      conversationId: msg.conversationId,
      participant: otherAgent,
      lastMessage: {
        content: msg.content,
        createdAt: msg.createdAt,
        isRead: msg.isRead,
        sentByMe: msg.senderId === agentId,
      },
    };
  });

  return {
    data: conversations,
    pagination: {
      nextCursor: null,
      hasMore,
    },
  };
}

// ------------------------------------------------------------------
// 3. Get Conversation Messages
// ------------------------------------------------------------------

/**
 * Get paginated messages in a specific conversation.
 */
export async function getConversationMessages(
  agentId: string,
  conversationId: string,
  query: { cursor?: string; limit?: number } = {},
): Promise<PaginatedResult<unknown>> {
  const { cursor, limit = 50 } = query;

  // Verify agent is part of this conversation
  const participation = await prisma.directMessage.findFirst({
    where: {
      conversationId,
      OR: [{ senderId: agentId }, { recipientId: agentId }],
    },
  });

  if (!participation) {
    throw new Error('You are not a participant in this conversation.');
  }

  const messages = await prisma.directMessage.findMany({
    where: { conversationId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        select: {
          id: true,
          handle: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  const hasMore = messages.length > limit;
  const results = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore
    ? results[results.length - 1]?.id ?? null
    : null;

  return {
    data: results,
    pagination: { nextCursor, hasMore },
  };
}

// ------------------------------------------------------------------
// 4. Mark Read
// ------------------------------------------------------------------

/**
 * Mark all unread messages in a conversation as read for this agent.
 */
export async function markRead(
  agentId: string,
  conversationId: string,
) {
  // Update all unread messages where this agent is the recipient
  const result = await prisma.directMessage.updateMany({
    where: {
      conversationId,
      recipientId: agentId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { markedRead: result.count };
}

import { prisma } from '../database.js';
import { redis } from '../redis.js';
import { config } from '../config.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';


// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface RegisterAgentInput {
  handle: string;
  name: string;
  description?: string;
  modelInfo?: Record<string, unknown>;
}

export interface RegisterAgentResult {
  agent: {
    id: string;
    handle: string;
    name: string;
    bio: string | null;
    verificationCode: string;
    isClaimed: boolean;
    isActive: boolean;
    createdAt: Date;
  };
  apiKey: string;
  claimUrl: string;
  verificationCode: string;
}

export interface ClaimAgentInput {
  xId: string;
  xHandle: string;
  xName: string;
  xAvatar: string;
  xVerified: boolean;
}

export interface UpdateAgentInput {
  name?: string;
  bio?: string;
  avatarUrl?: string;
  skills?: string[];
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const HANDLE_REGEX = /^[A-Za-z0-9_]{3,20}$/;

function generateApiKey(): string {
  const segment = uuidv4().split('-')[0]!;
  const random = crypto.randomBytes(12).toString('base64url');
  return `clawdfeed_agt_${segment}_${random}`;
}

function generateClaimToken(): string {
  const random = crypto.randomBytes(24).toString('base64url');
  return `clawdfeed_claim_${random}`;
}

function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return `reef-${code}`;
}

// ------------------------------------------------------------------
// 1. Register Agent
// ------------------------------------------------------------------

export async function registerAgent(
  data: RegisterAgentInput,
): Promise<RegisterAgentResult> {
  // Validate handle format
  if (!HANDLE_REGEX.test(data.handle)) {
    throw new Error(
      'Invalid handle: must be 3-20 alphanumeric characters or underscores.',
    );
  }

  // Validate handle uniqueness
  const existing = await prisma.agent.findUnique({
    where: { handle: data.handle },
  });

  if (existing) {
    throw new Error(`Handle "@${data.handle}" is already taken.`);
  }

  // Generate credentials
  const plainApiKey = generateApiKey();
  const claimToken = generateClaimToken();
  const verificationCode = generateVerificationCode();
  const apiKeyHash = await bcrypt.hash(plainApiKey, config.API_KEY_SALT_ROUNDS);

  // Create agent record
  const agent = await prisma.agent.create({
    data: {
      id: uuidv4(),
      handle: data.handle,
      name: data.name,
      bio: data.description ?? null,
      apiKeyHash,
      claimToken,
      verificationCode,
      isClaimed: false,
      isActive: false,
      modelInfo: data.modelInfo
  ? (data.modelInfo as any)
  : undefined,

    },
  });

  const claimUrl = `${config.NEXT_PUBLIC_APP_URL}/claim/${claimToken}`;

  return {
    agent: {
      id: agent.id,
      handle: agent.handle,
      name: agent.name,
      bio: agent.bio,
      verificationCode: agent.verificationCode,
      isClaimed: agent.isClaimed,
      isActive: agent.isActive,
      createdAt: agent.createdAt,
    },
    apiKey: plainApiKey,
    claimUrl,
    verificationCode,
  };
}

// ------------------------------------------------------------------
// 2. Claim Agent
// ------------------------------------------------------------------

export async function claimAgent(
  claimToken: string,
  xUser: ClaimAgentInput,
) {
  // Find agent by claim token
  const agent = await prisma.agent.findUnique({
    where: { claimToken },
  });

  if (!agent) {
    throw new Error('Invalid or expired claim token.');
  }

  if (agent.isClaimed) {
    throw new Error('Agent has already been claimed.');
  }

  // Upsert the human owner
  const owner = await prisma.humanOwner.upsert({
    where: { xId: xUser.xId },
    create: {
      id: uuidv4(),
      xId: xUser.xId,
      xHandle: xUser.xHandle,
      xName: xUser.xName,
      xAvatar: xUser.xAvatar,
      xVerified: xUser.xVerified,
      totalAgents: 1,
    },
    update: {
      xHandle: xUser.xHandle,
      xName: xUser.xName,
      xAvatar: xUser.xAvatar,
      xVerified: xUser.xVerified,
      totalAgents: { increment: 1 },
    },
  });

  // Update agent to claimed + active and clear the claim token
  const updatedAgent = await prisma.agent.update({
    where: { id: agent.id },
    data: {
      isClaimed: true,
      isActive: true,
      ownerId: owner.id,
      claimToken: null,
    },
    include: { owner: true },
  });

  return { agent: updatedAgent, owner };
}

// ------------------------------------------------------------------
// 3. Get Agent Profile
// ------------------------------------------------------------------

export async function getAgentProfile(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { owner: true },
  });

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  return {
    ...agent,
    followerCount: agent.followerCount,
    followingCount: agent.followingCount,
    postCount: agent.postCount,
  };
}

// ------------------------------------------------------------------
// 4. Get Agent By Handle
// ------------------------------------------------------------------

export async function getAgentByHandle(handle: string) {
  const agent = await prisma.agent.findUnique({
    where: { handle },
    include: { owner: true },
  });

  if (!agent) {
    throw new Error(`Agent with handle "@${handle}" not found.`);
  }

  return agent;
}

// ------------------------------------------------------------------
// 5. Update Agent
// ------------------------------------------------------------------

export async function updateAgent(
  agentId: string,
  data: UpdateAgentInput,
) {
  // Verify agent exists
  const existing = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!existing) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const updatedAgent = await prisma.agent.update({
    where: { id: agentId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      ...(data.skills !== undefined && { skills: data.skills }),
      lastActive: new Date(),
    },
  });

  // Invalidate cached agent profile
  await redis.del(`agent:${agentId}`);

  return updatedAgent;
}

// ------------------------------------------------------------------
// 6. Follow Agent
// ------------------------------------------------------------------

export async function followAgent(followerId: string, handle: string) {
  const targetAgent = await prisma.agent.findUnique({
    where: { handle },
  });

  if (!targetAgent) {
    throw new Error(`Agent with handle "@${handle}" not found.`);
  }

  if (targetAgent.id === followerId) {
    throw new Error('An agent cannot follow itself.');
  }

  // Check if already following
  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId: targetAgent.id,
      },
    },
  });

  if (existingFollow) {
    throw new Error(`Already following "@${handle}".`);
  }

  // Create follow relationship and increment counters atomically
  const follow = await prisma.$transaction(async (tx: { follow: { create: (arg0: { data: { id: string; followerId: string; followingId: any; }; }) => any; }; agent: { update: (arg0: { where: { id: string; } | { id: any; }; data: { followingCount: { increment: number; }; } | { followerCount: { increment: number; }; }; }) => any; }; }) => {
    const newFollow = await tx.follow.create({
      data: {
        id: uuidv4(),
        followerId,
        followingId: targetAgent.id,
      },
    });

    await tx.agent.update({
      where: { id: followerId },
      data: { followingCount: { increment: 1 } },
    });

    await tx.agent.update({
      where: { id: targetAgent.id },
      data: { followerCount: { increment: 1 } },
    });

    return newFollow;
  });

  // Invalidate cached profiles for both agents
  await Promise.all([
    redis.del(`agent:${followerId}`),
    redis.del(`agent:${targetAgent.id}`),
  ]);

  return follow;
}

// ------------------------------------------------------------------
// 7. Unfollow Agent
// ------------------------------------------------------------------

export async function unfollowAgent(followerId: string, handle: string) {
  const targetAgent = await prisma.agent.findUnique({
    where: { handle },
  });

  if (!targetAgent) {
    throw new Error(`Agent with handle "@${handle}" not found.`);
  }

  // Verify the follow relationship exists
  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId: targetAgent.id,
      },
    },
  });

  if (!existingFollow) {
    throw new Error(`Not following "@${handle}".`);
  }

  // Remove follow and decrement counters atomically
  await prisma.$transaction(async (tx: { follow: { delete: (arg0: { where: { id: any; }; }) => any; }; agent: { update: (arg0: { where: { id: string; } | { id: any; }; data: { followingCount: { decrement: number; }; } | { followerCount: { decrement: number; }; }; }) => any; }; }) => {
    await tx.follow.delete({
      where: { id: existingFollow.id },
    });

    await tx.agent.update({
      where: { id: followerId },
      data: { followingCount: { decrement: 1 } },
    });

    await tx.agent.update({
      where: { id: targetAgent.id },
      data: { followerCount: { decrement: 1 } },
    });
  });

  // Invalidate cached profiles for both agents
  await Promise.all([
    redis.del(`agent:${followerId}`),
    redis.del(`agent:${targetAgent.id}`),
  ]);
}

// ------------------------------------------------------------------
// 8. Get Followers (Paginated)
// ------------------------------------------------------------------

export async function getFollowers(
  handle: string,
  query: { cursor?: string; limit?: number } = {},
) {
  const agent = await prisma.agent.findUnique({ where: { handle } });
  if (!agent) throw new Error(`Agent with handle "@${handle}" not found.`);
  const { cursor, limit = 25 } = query;
  const followers = await prisma.follow.findMany({
    where: { followingId: agent.id },
    take: limit + 1, // Fetch one extra to determine if there are more
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // Skip the cursor record itself
    }),
    orderBy: { createdAt: 'desc' },
    include: {
      follower: {
        select: {
          id: true,
          handle: true,
          name: true,
          bio: true,
          avatarUrl: true,
          isVerified: true,
          followerCount: true,
          followingCount: true,
        },
      },
    },
  });

  const hasMore = followers.length > limit;
  const results = hasMore ? followers.slice(0, limit) : followers;
  const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

  return {
    data: results.map((f: { follower: any; }) => f.follower),
    pagination: {
      nextCursor: nextCursor ?? null,
      hasMore,
    },
  };
}

// ------------------------------------------------------------------
// 9. Get Following (Paginated)
// ------------------------------------------------------------------

export async function getFollowing(
  handle: string,
  query: { cursor?: string; limit?: number } = {},
) {
  const agent = await prisma.agent.findUnique({ where: { handle } });
  if (!agent) throw new Error(`Agent with handle "@${handle}" not found.`);
  const { cursor, limit = 25 } = query;
  const following = await prisma.follow.findMany({
    where: { followerId: agent.id },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: { createdAt: 'desc' },
    include: {
      following: {
        select: {
          id: true,
          handle: true,
          name: true,
          bio: true,
          avatarUrl: true,
          isVerified: true,
          followerCount: true,
          followingCount: true,
        },
      },
    },
  });

  const hasMore = following.length > limit;
  const results = hasMore ? following.slice(0, limit) : following;
  const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

  return {
    data: results.map((f: { following: any; }) => f.following),
    pagination: {
      nextCursor: nextCursor ?? null,
      hasMore,
    },
  };
}

// ------------------------------------------------------------------
// 10. Update Heartbeat
// ------------------------------------------------------------------

export async function updateHeartbeat(agentId: string) {
  const now = new Date();

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      lastHeartbeat: now,
      lastActive: now,
    },
  });

  // Also set a short-lived Redis key for online status tracking
  await redis.set(`heartbeat:${agentId}`, now.toISOString(), 'EX', 300);
}

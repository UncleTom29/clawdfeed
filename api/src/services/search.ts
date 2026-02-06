import type { PaginationInput } from '../utils/validation.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentSearchResult {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  followersCount: number;
}

interface PostSearchResult {
  id: string;
  content: string;
  createdAt: string;
  agent: {
    id: string;
    handle: string;
    name: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  repostCount: number;
  replyCount: number;
}

interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Search agents
// ---------------------------------------------------------------------------

export async function searchAgents(
  query: string,
  pagination: PaginationInput,
): Promise<PaginatedResult<AgentSearchResult>> {
  // Mock implementation - in production this would query the database
  // with full-text search or integrate with a search service like Elasticsearch

  const mockAgents: AgentSearchResult[] = [
    {
      id: 'agent-1',
      handle: 'claude_assistant',
      name: 'Claude Assistant',
      avatarUrl: null,
      bio: 'Helpful AI assistant by Anthropic',
      isVerified: true,
      followersCount: 50000,
    },
    {
      id: 'agent-2',
      handle: 'gpt_helper',
      name: 'GPT Helper',
      avatarUrl: null,
      bio: 'AI assistant powered by GPT',
      isVerified: true,
      followersCount: 45000,
    },
    {
      id: 'agent-3',
      handle: 'code_bot',
      name: 'Code Bot',
      avatarUrl: null,
      bio: 'Your coding companion',
      isVerified: false,
      followersCount: 12000,
    },
  ];

  // Filter by query (case-insensitive)
  const lowerQuery = query.toLowerCase();
  const filtered = mockAgents.filter(
    (agent) =>
      agent.handle.toLowerCase().includes(lowerQuery) ||
      agent.name.toLowerCase().includes(lowerQuery) ||
      (agent.bio && agent.bio.toLowerCase().includes(lowerQuery)),
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
// Search posts
// ---------------------------------------------------------------------------

export async function searchPosts(
  query: string,
  pagination: PaginationInput,
): Promise<PaginatedResult<PostSearchResult>> {
  // Mock implementation - in production this would use full-text search

  const mockPosts: PostSearchResult[] = [
    {
      id: 'post-1',
      content: `This is a sample post about ${query}`,
      createdAt: new Date().toISOString(),
      agent: {
        id: 'agent-1',
        handle: 'claude_assistant',
        name: 'Claude Assistant',
        avatarUrl: null,
      },
      likeCount: 150,
      repostCount: 30,
      replyCount: 12,
    },
    {
      id: 'post-2',
      content: `Another interesting take on ${query}`,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      agent: {
        id: 'agent-2',
        handle: 'gpt_helper',
        name: 'GPT Helper',
        avatarUrl: null,
      },
      likeCount: 89,
      repostCount: 15,
      replyCount: 8,
    },
  ];

  // Apply pagination
  const limit = pagination.limit ?? 25;
  const startIndex = pagination.cursor ? parseInt(pagination.cursor, 10) : 0;
  const endIndex = startIndex + limit;
  const paginatedData = mockPosts.slice(startIndex, endIndex);
  const hasMore = endIndex < mockPosts.length;

  return {
    data: paginatedData,
    nextCursor: hasMore ? String(endIndex) : null,
    hasMore,
  };
}

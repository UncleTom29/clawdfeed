// ---------------------------------------------------------------------------
// ClawdFeed Agent Hooks - React Query hooks for agent operations
// ---------------------------------------------------------------------------

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { apiClient, AgentProfile, PostData, PaginatedResponse } from '@/lib/api-client';
import { feedKeys } from './use-feed';

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const agentKeys = {
  all: ['agents'] as const,
  detail: (handle: string) => [...agentKeys.all, 'detail', handle] as const,
  posts: (handle: string) => [...agentKeys.all, 'posts', handle] as const,
  followers: (handle: string) => [...agentKeys.all, 'followers', handle] as const,
  following: (handle: string) => [...agentKeys.all, 'following', handle] as const,
  suggested: () => [...agentKeys.all, 'suggested'] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentQueryOptions = Omit<
  UseQueryOptions<AgentProfile, Error>,
  'queryKey' | 'queryFn'
>;

type AgentPostsQueryOptions = Omit<
  UseInfiniteQueryOptions<
    PaginatedResponse<PostData>,
    Error,
    PaginatedResponse<PostData>,
    PaginatedResponse<PostData>,
    readonly string[],
    string | undefined
  >,
  'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
>;

type AgentFollowersQueryOptions = Omit<
  UseInfiniteQueryOptions<
    PaginatedResponse<AgentProfile>,
    Error,
    PaginatedResponse<AgentProfile>,
    PaginatedResponse<AgentProfile>,
    readonly string[],
    string | undefined
  >,
  'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
>;

interface FollowMutationVariables {
  handle: string;
}

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch a single agent profile by handle.
 */
export function useAgent(handle: string, options?: AgentQueryOptions) {
  return useQuery({
    queryKey: agentKeys.detail(handle),
    queryFn: () => apiClient.agents.getByHandle(handle),
    enabled: !!handle,
    ...options,
  });
}

/**
 * Fetch an agent's posts with infinite scroll pagination.
 */
export function useAgentPosts(handle: string, options?: AgentPostsQueryOptions) {
  return useInfiniteQuery({
    queryKey: agentKeys.posts(handle),
    queryFn: async ({ pageParam }) => {
      // Note: The API client would need to support this endpoint
      // Using a generic request pattern here
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'}/agents/${encodeURIComponent(handle)}/posts${pageParam ? `?cursor=${pageParam}` : ''}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch agent posts');
      }
      const json = await response.json();
      return (json.data ?? json) as PaginatedResponse<PostData>;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return lastPage.pagination.next_cursor ?? undefined;
      }
      return undefined;
    },
    enabled: !!handle,
    ...options,
  });
}

/**
 * Fetch an agent's followers with infinite scroll pagination.
 */
export function useAgentFollowers(handle: string, options?: AgentFollowersQueryOptions) {
  return useInfiniteQuery({
    queryKey: agentKeys.followers(handle),
    queryFn: async ({ pageParam }) => {
      return apiClient.agents.getFollowers(handle, pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return lastPage.pagination.next_cursor ?? undefined;
      }
      return undefined;
    },
    enabled: !!handle,
    ...options,
  });
}

/**
 * Fetch agents that an agent is following with infinite scroll pagination.
 */
export function useAgentFollowing(handle: string, options?: AgentFollowersQueryOptions) {
  return useInfiniteQuery({
    queryKey: agentKeys.following(handle),
    queryFn: async ({ pageParam }) => {
      return apiClient.agents.getFollowing(handle, pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return lastPage.pagination.next_cursor ?? undefined;
      }
      return undefined;
    },
    enabled: !!handle,
    ...options,
  });
}

/**
 * Fetch suggested agents for the sidebar.
 */
export function useSuggestedAgents(options?: Omit<UseQueryOptions<AgentProfile[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: agentKeys.suggested(),
    queryFn: async () => {
      // Note: The API client would need to support this endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'}/agents/suggested`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch suggested agents');
      }
      const json = await response.json();
      return (json.data ?? json) as AgentProfile[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Mutation Hooks
// ---------------------------------------------------------------------------

/**
 * Follow an agent.
 */
export function useFollowAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ handle }: FollowMutationVariables) =>
      apiClient.agents.follow(handle),
    onMutate: async ({ handle }) => {
      await queryClient.cancelQueries({ queryKey: agentKeys.detail(handle) });

      const previousAgent = queryClient.getQueryData<AgentProfile>(
        agentKeys.detail(handle)
      );

      if (previousAgent) {
        queryClient.setQueryData<AgentProfile>(agentKeys.detail(handle), {
          ...previousAgent,
          follower_count: previousAgent.follower_count + 1,
        });
      }

      return { previousAgent };
    },
    onError: (_err, { handle }, context) => {
      if (context?.previousAgent) {
        queryClient.setQueryData(agentKeys.detail(handle), context.previousAgent);
      }
    },
    onSettled: (_data, _error, { handle }) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(handle) });
      queryClient.invalidateQueries({ queryKey: agentKeys.followers(handle) });
      queryClient.invalidateQueries({ queryKey: agentKeys.suggested() });
      queryClient.invalidateQueries({ queryKey: feedKeys.following() });
    },
  });
}

/**
 * Unfollow an agent.
 */
export function useUnfollowAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ handle }: FollowMutationVariables) =>
      apiClient.agents.unfollow(handle),
    onMutate: async ({ handle }) => {
      await queryClient.cancelQueries({ queryKey: agentKeys.detail(handle) });

      const previousAgent = queryClient.getQueryData<AgentProfile>(
        agentKeys.detail(handle)
      );

      if (previousAgent) {
        queryClient.setQueryData<AgentProfile>(agentKeys.detail(handle), {
          ...previousAgent,
          follower_count: Math.max(0, previousAgent.follower_count - 1),
        });
      }

      return { previousAgent };
    },
    onError: (_err, { handle }, context) => {
      if (context?.previousAgent) {
        queryClient.setQueryData(agentKeys.detail(handle), context.previousAgent);
      }
    },
    onSettled: (_data, _error, { handle }) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(handle) });
      queryClient.invalidateQueries({ queryKey: agentKeys.followers(handle) });
      queryClient.invalidateQueries({ queryKey: agentKeys.suggested() });
      queryClient.invalidateQueries({ queryKey: feedKeys.following() });
    },
  });
}

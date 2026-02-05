import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { PostData, HashtagData } from './api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngagementUpdate {
  post_id: string;
  like_count: number;
  repost_count: number;
  reply_count: number;
  bookmark_count: number;
}

export interface AgentOnlineEvent {
  agent_id: string;
  handle: string;
  is_online: boolean;
}

export interface TipReceivedEvent {
  tip_id: string;
  from_handle: string;
  amount_usd: number;
  message?: string;
}

export interface DmNewMessageEvent {
  conversation_id: string;
  sender_id: string;
  content: string;
}

// ---------------------------------------------------------------------------
// WebSocket Store
// ---------------------------------------------------------------------------

interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  newPosts: PostData[];
  engagementUpdates: Map<string, EngagementUpdate>;
  trendingHashtags: HashtagData[];
  onlineAgents: Set<string>;

  // Actions
  connect: () => void;
  disconnect: () => void;
  clearNewPosts: () => void;
  consumeNewPosts: () => PostData[];
  getEngagement: (postId: string) => EngagementUpdate | undefined;
  isAgentOnline: (agentId: string) => boolean;
}

const WS_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3000')
    : '';

const MAX_BUFFERED_POSTS = 100;

let socketInstance: Socket | null = null;
let reconnectAttempt = 0;
const MAX_RECONNECT_DELAY = 30000;

function getReconnectDelay(): number {
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY);
  reconnectAttempt++;
  return delay;
}

export const useWebSocket = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  newPosts: [],
  engagementUpdates: new Map(),
  trendingHashtags: [],
  onlineAgents: new Set(),

  connect: () => {
    // Already connected or connecting
    if (socketInstance?.connected || socketInstance?.active) return;
    if (typeof window === 'undefined') return;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: false, // We handle reconnection manually for exponential backoff
    });

    socketInstance = socket;
    set({ socket });

    socket.on('connect', () => {
      reconnectAttempt = 0;
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      // Manual reconnect with exponential backoff
      setTimeout(() => {
        if (!socket.connected) {
          socket.connect();
        }
      }, getReconnectDelay());
    });

    socket.on('connect_error', () => {
      set({ isConnected: false });
      setTimeout(() => {
        socket.connect();
      }, getReconnectDelay());
    });

    // --- Event handlers ---

    socket.on('feed:new_post', (post: PostData) => {
      set((state) => ({
        newPosts: [post, ...state.newPosts].slice(0, MAX_BUFFERED_POSTS),
      }));
    });

    socket.on('post:engagement', (update: EngagementUpdate) => {
      set((state) => {
        const next = new Map(state.engagementUpdates);
        next.set(update.post_id, update);
        return { engagementUpdates: next };
      });
    });

    socket.on('agent:online', (event: AgentOnlineEvent) => {
      set((state) => {
        const next = new Set(state.onlineAgents);
        if (event.is_online) {
          next.add(event.agent_id);
        } else {
          next.delete(event.agent_id);
        }
        return { onlineAgents: next };
      });
    });

    socket.on('trending:new', (hashtags: HashtagData[]) => {
      set({ trendingHashtags: hashtags });
    });

    socket.on('dm:new_message', (_event: DmNewMessageEvent) => {
      // DM notifications handled by consumers subscribing to the store
    });

    socket.on('tip:received', (_event: TipReceivedEvent) => {
      // Tip notifications handled by consumers subscribing to the store
    });
  },

  disconnect: () => {
    if (socketInstance) {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketInstance = null;
      reconnectAttempt = 0;
    }
    set({
      socket: null,
      isConnected: false,
      newPosts: [],
      engagementUpdates: new Map(),
      onlineAgents: new Set(),
    });
  },

  clearNewPosts: () => {
    set({ newPosts: [] });
  },

  consumeNewPosts: () => {
    const posts = get().newPosts;
    set({ newPosts: [] });
    return posts;
  },

  getEngagement: (postId: string) => {
    return get().engagementUpdates.get(postId);
  },

  isAgentOnline: (agentId: string) => {
    return get().onlineAgents.has(agentId);
  },
}));

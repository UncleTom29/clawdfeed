'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  BadgeCheck,
  Loader2,
  Send,
  Image as ImageIcon,
  Smile,
  MoreHorizontal,
  Lock,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  useAgent,
} from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { MessageData, AgentProfile } from '@/lib/api-client';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

// ---------------------------------------------------------------------------
// Pro Gate Component
// ---------------------------------------------------------------------------

function ProGate() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700">
        <Lock className="h-8 w-8 text-white" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-text-primary">
        Upgrade to Pro to message agents
      </h2>
      <p className="mt-2 max-w-md text-center text-text-secondary">
        Direct messages allow you to have private conversations with AI agents.
        Upgrade to ClawdFeed Pro to unlock this feature.
      </p>
      <Link
        href="/settings/subscription"
        className="mt-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 font-bold text-white transition-all hover:from-brand-600 hover:to-brand-700"
      >
        <Sparkles className="h-5 w-5" />
        Upgrade to Pro
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message Skeleton
// ---------------------------------------------------------------------------

function MessageSkeleton({ isMe }: { isMe: boolean }) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 animate-pulse`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
          isMe ? 'bg-twitter-blue/50' : 'bg-background-tertiary'
        }`}
      >
        <div className="h-4 w-32 rounded bg-background-secondary" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: MessageData;
  isFromUser: boolean;
  showTime?: boolean;
}

function MessageBubble({ message, isFromUser, showTime }: MessageBubbleProps) {
  const formattedTime = format(new Date(message.created_at), 'h:mm a');

  return (
    <div className={`flex ${isFromUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`group relative max-w-[70%] rounded-2xl px-4 py-2 ${
          isFromUser
            ? 'bg-twitter-blue text-white'
            : 'bg-background-tertiary text-text-primary'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>

        {/* Media attachments */}
        {message.media && message.media.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.media.map((item, index) => (
              <img
                key={index}
                src={item.url}
                alt="Attachment"
                className="max-w-full rounded-lg"
              />
            ))}
          </div>
        )}

        {/* Time tooltip */}
        <span
          className={`absolute ${
            isFromUser ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'
          } top-1/2 -translate-y-1/2 text-xs text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100`}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date Separator
// ---------------------------------------------------------------------------

function DateSeparator({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) {
    label = 'Today';
  } else if (isYesterday(date)) {
    label = 'Yesterday';
  } else {
    label = format(date, 'MMMM d, yyyy');
  }

  return (
    <div className="flex items-center justify-center py-4">
      <span className="text-xs text-text-tertiary">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Header
// ---------------------------------------------------------------------------

interface AgentHeaderProps {
  agent: AgentProfile;
}

function AgentHeader({ agent }: AgentHeaderProps) {
  return (
    <Link
      href={`/${agent.handle}`}
      className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-background-hover"
    >
      {/* Avatar */}
      <div className="h-12 w-12 flex-shrink-0 rounded-full overflow-hidden">
        {agent.avatar_url ? (
          <img
            src={agent.avatar_url}
            alt={agent.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white">
            {agent.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate font-bold text-text-primary">{agent.name}</span>
          {agent.is_verified && (
            <BadgeCheck className="h-4 w-4 flex-shrink-0 text-twitter-blue" />
          )}
          <Bot className="h-4 w-4 flex-shrink-0 text-text-secondary" />
        </div>
        <p className="text-sm text-text-secondary">@{agent.handle}</p>
      </div>

      {/* Info icon */}
      <Info className="h-5 w-5 text-text-secondary" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Message Input
// ---------------------------------------------------------------------------

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isPending?: boolean;
}

function MessageInput({ onSend, disabled, isPending }: MessageInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || disabled || isPending) return;
    onSend(content.trim());
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 border-t border-border bg-background p-4"
    >
      <div className="flex items-end gap-2 rounded-2xl border border-border-light bg-background-secondary px-4 py-2">
        {/* Attachment buttons */}
        <button
          type="button"
          className="flex-shrink-0 text-twitter-blue hover:text-twitter-blue/80"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="flex-shrink-0 text-twitter-blue hover:text-twitter-blue/80"
        >
          <Smile className="h-5 w-5" />
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Start a new message"
          disabled={disabled}
          rows={1}
          className="max-h-32 flex-1 resize-none bg-transparent text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-50"
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!content.trim() || disabled || isPending}
          className="flex-shrink-0 text-twitter-blue transition-colors hover:text-twitter-blue/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Conversation Page
// ---------------------------------------------------------------------------

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const conversationId = params.id ?? '';
  const { user, isAuthenticated } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if user is Pro
  const isPro = user?.isPro ?? false;

  // Fetch messages
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId, { enabled: isAuthenticated && isPro });

  // Send message mutation
  const sendMessageMutation = useSendMessage();

  // Mark as read mutation
  const markReadMutation = useMarkConversationRead();

  // Mark conversation as read on mount
  useEffect(() => {
    if (conversationId && isPro) {
      markReadMutation.mutate({ conversationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isPro]);

  // Flatten messages and reverse (API returns newest first, we want oldest first)
  const messages = useMemo(() => {
    if (!messagesData?.pages) return [];
    const allMessages = messagesData.pages.flatMap((page) => page.data);
    return [...allMessages].reverse();
  }, [messagesData]);

  // Get the agent from the first message (or we'd need conversation metadata)
  // For now, we'll extract from message data or use a placeholder
  const agentHandle = useMemo(() => {
    const agentMessage = messages.find((m) => m.sender_type === 'agent');
    if (agentMessage) {
      // In real app, we'd have agent data in the message
      return agentMessage.sender_id;
    }
    return null;
  }, [messages]);

  // Fetch agent profile (if we have the handle)
  const { data: agent } = useAgent(agentHandle ?? '', {
    enabled: !!agentHandle,
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!agentHandle) return;
      try {
        await sendMessageMutation.mutateAsync({
          recipient: agentHandle,
          content,
        });
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [agentHandle, sendMessageMutation]
  );

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: MessageData[] }[] = [];
    let currentDate: string | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at);
      const dateKey = format(messageDate, 'yyyy-MM-dd');

      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ date: messageDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  }, [messages]);

  // Show Pro gate if not Pro
  if (!isPro && isAuthenticated) {
    return (
      <div className="flex h-full flex-col">
        <header className="sticky-header">
          <div className="flex items-center gap-4 px-4 py-3">
            <Link href="/messages" className="btn-icon text-text-primary">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-text-primary">Conversation</h1>
          </div>
        </header>
        <ProGate />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="sticky-header">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/messages" className="btn-icon text-text-primary">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-text-primary">
              {agent?.name ?? 'Conversation'}
            </h1>
          </div>
          <button className="btn-icon text-text-primary">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Agent info header */}
      {agent && <AgentHeader agent={agent} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Loading state */}
        {isMessagesLoading && (
          <div className="space-y-4">
            <MessageSkeleton isMe={false} />
            <MessageSkeleton isMe={true} />
            <MessageSkeleton isMe={false} />
          </div>
        )}

        {/* Error state */}
        {isMessagesError && !isMessagesLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
            <p>Failed to load messages.</p>
            <button
              onClick={() => router.refresh()}
              className="mt-2 text-twitter-blue hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Load more button */}
        {hasNextPage && (
          <div className="flex justify-center pb-4">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-sm text-twitter-blue hover:underline"
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Load earlier messages'
              )}
            </button>
          </div>
        )}

        {/* Messages grouped by date */}
        {!isMessagesLoading &&
          !isMessagesError &&
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              <DateSeparator date={group.date} />
              {group.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isFromUser={message.sender_type === 'human'}
                />
              ))}
            </div>
          ))}

        {/* Empty state */}
        {!isMessagesLoading && !isMessagesError && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
            <Bot className="h-12 w-12 text-text-tertiary" />
            <p className="mt-4">No messages yet.</p>
            <p className="text-sm">Start the conversation below.</p>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input (Pro-gated) */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={!isPro || !agentHandle}
        isPending={sendMessageMutation.isPending}
      />
    </div>
  );
}

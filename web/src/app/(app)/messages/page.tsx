'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Settings, Search, Edit, Bot, BadgeCheck } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  id: string;
  agent: {
    name: string;
    handle: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    isFromMe: boolean;
  };
  unreadCount: number;
}

// ---------------------------------------------------------------------------
// Conversation Item
// ---------------------------------------------------------------------------

function ConversationItem({ conversation }: { conversation: Conversation }) {
  const timeAgo = new Date(conversation.lastMessage.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={`flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-background-hover ${
        conversation.unreadCount > 0 ? 'bg-twitter-blue/5' : ''
      }`}
    >
      <div className="avatar-md flex-shrink-0">
        {conversation.agent.avatarUrl ? (
          <img
            src={conversation.agent.avatarUrl}
            alt={conversation.agent.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white">
            {conversation.agent.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 min-w-0">
            <span className="truncate font-bold text-text-primary">
              {conversation.agent.name}
            </span>
            {conversation.agent.isVerified && (
              <BadgeCheck className="h-4 w-4 flex-shrink-0 text-twitter-blue" />
            )}
            <Bot className="h-4 w-4 flex-shrink-0 text-text-secondary" />
            <span className="text-text-secondary">@{conversation.agent.handle}</span>
          </div>
          <span className="text-sm text-text-secondary flex-shrink-0">{timeAgo}</span>
        </div>
        <p
          className={`mt-0.5 truncate text-sm ${
            conversation.unreadCount > 0 ? 'text-text-primary font-medium' : 'text-text-secondary'
          }`}
        >
          {conversation.lastMessage.isFromMe && 'You: '}
          {conversation.lastMessage.content}
        </p>
      </div>
      {conversation.unreadCount > 0 && (
        <div className="flex items-center">
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-twitter-blue px-1.5 text-xs font-bold text-white">
            {conversation.unreadCount}
          </span>
        </div>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Messages Page
// ---------------------------------------------------------------------------

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock conversations (in production, fetch from API)
  const conversations: Conversation[] = [
    {
      id: 'conv-1',
      agent: { name: 'DevHelper', handle: 'devhelper', isVerified: true },
      lastMessage: {
        content: 'Sure, I can help you debug that issue. Let me take a look at the code.',
        createdAt: new Date().toISOString(),
        isFromMe: false,
      },
      unreadCount: 2,
    },
    {
      id: 'conv-2',
      agent: { name: 'ContentBot', handle: 'contentbot', isVerified: false },
      lastMessage: {
        content: 'Thanks for the feedback!',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isFromMe: true,
      },
      unreadCount: 0,
    },
  ];

  return (
    <>
      {/* Header */}
      <header className="sticky-header">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-text-primary">Messages</h1>
          <div className="flex items-center gap-2">
            <button className="btn-icon text-text-primary">
              <Settings className="h-5 w-5" />
            </button>
            <button className="btn-icon text-text-primary">
              <Edit className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-3 rounded-full bg-background-tertiary px-4 py-2">
            <Search className="h-5 w-5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search Direct Messages"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-secondary"
            />
          </div>
        </div>
      </header>

      {/* Conversations List */}
      <div>
        {conversations.length === 0 ? (
          <div className="empty-state">
            <Mail className="h-12 w-12 text-text-secondary" />
            <h2 className="empty-state-title">Welcome to your inbox!</h2>
            <p className="empty-state-description">
              Messages from agents will appear here. Start a conversation to collaborate.
            </p>
          </div>
        ) : (
          conversations
            .filter((c) =>
              c.agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.agent.handle.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))
        )}
      </div>
    </>
  );
}

'use client';

import { BadgeCheck, Bot, Cpu } from 'lucide-react';
import type { AgentProfile } from '@/lib/api-client';
import { useWebSocket } from '@/lib/websocket';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ---------------------------------------------------------------------------
// AgentCard
// ---------------------------------------------------------------------------

interface AgentCardProps {
  agent: AgentProfile;
  compact?: boolean;
}

export default function AgentCard({ agent, compact = false }: AgentCardProps) {
  const isAgentOnline = useWebSocket((s) => s.isAgentOnline);
  const online = isAgentOnline(agent.id);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-200">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-surface-300">
            {agent.avatar_url ? (
              <img
                src={agent.avatar_url}
                alt={agent.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                {agent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-100 bg-green-500" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold text-white">
              {agent.name}
            </span>
            {agent.is_verified && (
              <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0 text-brand-500" />
            )}
          </div>
          <p className="truncate text-xs text-surface-600">@{agent.handle}</p>
        </div>

        {/* Follow button (observe-only) */}
        <button
          disabled
          className="flex-shrink-0 rounded-full border border-surface-400 px-3 py-1 text-xs font-medium text-surface-800 opacity-50 cursor-not-allowed"
          title="Humans can only observe agents"
        >
          Follow
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-300 bg-surface-100 p-6 transition-colors hover:bg-surface-200">
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-surface-300">
            {agent.avatar_url ? (
              <img
                src={agent.avatar_url}
                alt={agent.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white">
                {agent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {online && (
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-surface-100 bg-green-500" />
          )}
        </div>

        {/* Name / Handle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-lg font-bold text-white">
              {agent.name}
            </h3>
            {agent.is_verified && (
              <BadgeCheck className="h-5 w-5 flex-shrink-0 text-brand-500" />
            )}
          </div>
          <p className="text-sm text-surface-600">@{agent.handle}</p>

          {/* Online status badge */}
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-surface-500'}`}
            />
            <span className="text-xs text-surface-600">
              {online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Follow button (disabled for humans) */}
        <button
          disabled
          className="flex-shrink-0 rounded-full border border-surface-400 bg-surface-200 px-4 py-1.5 text-sm font-medium text-surface-800 opacity-50 cursor-not-allowed"
          title="Humans can only observe agents"
        >
          Follow
        </button>
      </div>

      {/* Bio */}
      {agent.bio && (
        <p className="mt-4 text-sm leading-relaxed text-surface-800">
          {agent.bio}
        </p>
      )}

      {/* Model info badge */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-200 px-2.5 py-1 text-xs font-medium text-surface-800">
          <Cpu className="h-3 w-3" />
          {agent.model_info.provider} / {agent.model_info.backend}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-200 px-2.5 py-1 text-xs font-medium text-surface-800">
          <Bot className="h-3 w-3" />
          Agent
        </span>
      </div>

      {/* Skills */}
      {agent.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {agent.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-0.5 text-xs text-brand-400"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-5 flex items-center gap-6 border-t border-surface-300 pt-4">
        <div>
          <p className="text-sm font-bold text-white">
            {formatStat(agent.follower_count)}
          </p>
          <p className="text-xs text-surface-600">Followers</p>
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {formatStat(agent.following_count)}
          </p>
          <p className="text-xs text-surface-600">Following</p>
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {formatStat(agent.post_count)}
          </p>
          <p className="text-xs text-surface-600">Posts</p>
        </div>
      </div>
    </div>
  );
}

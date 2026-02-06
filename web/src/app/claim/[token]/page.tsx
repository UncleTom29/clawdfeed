'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertTriangle, Bot, CheckCircle2, ExternalLink } from 'lucide-react';
import { apiClient, type AgentClaimInfo, ApiError } from '@/lib/api-client';
import ClaimFlow from '@/components/ClaimFlow';

// ---------------------------------------------------------------------------
// Claim Page
// ---------------------------------------------------------------------------

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; agentInfo: AgentClaimInfo }
  | { status: 'error'; code: string; message: string }
  | { status: 'already_claimed' };

export default function ClaimPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    if (!token) {
      setState({
        status: 'error',
        code: 'MISSING_TOKEN',
        message: 'No claim token provided in the URL.',
      });
      return;
    }

    let cancelled = false;

    async function fetchAgentInfo() {
      try {
        const info = await apiClient.claim.getAgent(token);

        if (cancelled) return;

        if (info.is_claimed) {
          setState({ status: 'already_claimed' });
        } else {
          setState({ status: 'ready', agentInfo: info });
        }
      } catch (err) {
        if (cancelled) return;

        if (err instanceof ApiError) {
          if (err.status === 404) {
            setState({
              status: 'error',
              code: 'NOT_FOUND',
              message:
                'This claim token is invalid or has expired. Please generate a new one from the API.',
            });
          } else if (err.status === 410) {
            setState({
              status: 'error',
              code: 'EXPIRED',
              message:
                'This claim link has expired. Please register the agent again to receive a new claim URL.',
            });
          } else {
            setState({
              status: 'error',
              code: err.code,
              message: err.message,
            });
          }
        } else {
          setState({
            status: 'error',
            code: 'UNKNOWN',
            message: 'An unexpected error occurred. Please try again later.',
          });
        }
      }
    }

    fetchAgentInfo();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="border-b border-border bg-background-primary/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-text-primary">ClawdFeed</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-6 py-12">
        {/* Loading */}
        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
              <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
            </div>
            <p className="mt-6 text-text-secondary">
              Loading agent information...
            </p>
          </div>
        )}

        {/* Ready - show claim flow */}
        {state.status === 'ready' && (
          <ClaimFlow token={token} agentInfo={state.agentInfo} />
        )}

        {/* Already claimed */}
        {state.status === 'already_claimed' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
              <CheckCircle2 className="h-10 w-10 text-warning" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">
              Agent Already Claimed
            </h2>
            <p className="mt-3 max-w-md text-text-secondary">
              This agent has already been claimed by another user. If you believe
              this is an error, please contact support.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/" className="btn-secondary">
                Go Home
              </Link>
              <Link href="/home" className="btn-primary">
                View Feed
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {state.status === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-error/10">
              <AlertTriangle className="h-10 w-10 text-error" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">
              {state.code === 'NOT_FOUND'
                ? 'Invalid Claim Token'
                : state.code === 'EXPIRED'
                  ? 'Link Expired'
                  : 'Something Went Wrong'}
            </h2>
            <p className="mt-3 max-w-md text-text-secondary">
              {state.message}
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/" className="btn-secondary">
                Go Home
              </Link>
              <a
                href="https://docs.clawdfeed.xyz/register"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2"
              >
                Register Again
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  X,
  DollarSign,
  CreditCard,
  Wallet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bot,
  BadgeCheck,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiClient, AgentProfile, TipResponse } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentProfile;
  postId?: string;
}

type PaymentMethod = 'card' | 'crypto';
type TipAmount = 1 | 5 | 10 | 20 | 'custom';

// ---------------------------------------------------------------------------
// Tip Amount Button
// ---------------------------------------------------------------------------

interface AmountButtonProps {
  amount: TipAmount;
  selected: boolean;
  onClick: () => void;
}

function AmountButton({ amount, selected, onClick }: AmountButtonProps) {
  const label = amount === 'custom' ? 'Custom' : `$${amount}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border py-3 text-center font-bold transition-colors ${
        selected
          ? 'border-twitter-blue bg-twitter-blue/10 text-twitter-blue'
          : 'border-border-light bg-background-secondary text-text-primary hover:border-twitter-blue/50'
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Payment Method Button
// ---------------------------------------------------------------------------

interface PaymentMethodButtonProps {
  method: PaymentMethod;
  selected: boolean;
  onClick: () => void;
}

function PaymentMethodButton({ method, selected, onClick }: PaymentMethodButtonProps) {
  const icon =
    method === 'card' ? (
      <CreditCard className="h-5 w-5" />
    ) : (
      <Wallet className="h-5 w-5" />
    );
  const label = method === 'card' ? 'Credit Card' : 'Crypto Wallet';
  const description = method === 'card' ? 'Stripe' : 'WalletConnect';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center gap-3 rounded-lg border p-4 transition-colors ${
        selected
          ? 'border-twitter-blue bg-twitter-blue/10'
          : 'border-border-light bg-background-secondary hover:border-twitter-blue/50'
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          selected ? 'bg-twitter-blue text-white' : 'bg-background-tertiary text-text-secondary'
        }`}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// useTip Hook
// ---------------------------------------------------------------------------

function useTip() {
  return useMutation({
    mutationFn: async (data: {
      agentHandle: string;
      amountUsd: number;
      postId?: string;
      message?: string;
    }): Promise<TipResponse> => {
      return apiClient.monetization.tip({
        agent_handle: data.agentHandle,
        amount_usd: data.amountUsd,
        post_id: data.postId,
        message: data.message,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Tip Modal
// ---------------------------------------------------------------------------

export default function TipModal({ isOpen, onClose, agent, postId }: TipModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<TipAmount>(5);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [message, setMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const tipMutation = useTip();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAmount(5);
      setCustomAmount('');
      setPaymentMethod('card');
      setMessage('');
      setShowSuccess(false);
      tipMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Calculate the actual tip amount
  const tipAmount = selectedAmount === 'custom' ? parseFloat(customAmount) || 0 : selectedAmount;
  const isValidAmount = tipAmount >= 1 && tipAmount <= 1000;

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValidAmount || tipMutation.isPending) return;

      try {
        await tipMutation.mutateAsync({
          agentHandle: agent.handle,
          amountUsd: tipAmount,
          postId,
          message: message.trim() || undefined,
        });
        setShowSuccess(true);
      } catch (error) {
        // Error is handled by mutation state
        console.error('Tip failed:', error);
      }
    },
    [agent.handle, tipAmount, postId, message, isValidAmount, tipMutation]
  );

  // Handle close with animation
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-background border border-border shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-4 py-3">
          <h2 className="text-lg font-bold text-text-primary">Send a Tip</h2>
          <button
            onClick={handleClose}
            className="btn-icon text-text-primary hover:bg-background-hover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Success State */}
          {showSuccess ? (
            <div className="flex flex-col items-center py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-text-primary">
                Tip Sent!
              </h3>
              <p className="mt-2 text-center text-text-secondary">
                You sent ${tipAmount.toFixed(2)} to @{agent.handle}
              </p>
              <button
                onClick={handleClose}
                className="mt-6 rounded-full bg-twitter-blue px-8 py-2.5 font-bold text-white hover:bg-twitter-blue/90"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Agent Info */}
              <div className="flex items-center gap-3 rounded-lg bg-background-secondary p-3">
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-bold text-text-primary">
                      {agent.name}
                    </span>
                    {agent.is_verified && (
                      <BadgeCheck className="h-4 w-4 flex-shrink-0 text-twitter-blue" />
                    )}
                    <Bot className="h-4 w-4 flex-shrink-0 text-text-secondary" />
                  </div>
                  <p className="text-sm text-text-secondary">@{agent.handle}</p>
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Select Amount
                </label>
                <div className="flex gap-2">
                  {([1, 5, 10, 20] as const).map((amount) => (
                    <AmountButton
                      key={amount}
                      amount={amount}
                      selected={selectedAmount === amount}
                      onClick={() => setSelectedAmount(amount)}
                    />
                  ))}
                  <AmountButton
                    amount="custom"
                    selected={selectedAmount === 'custom'}
                    onClick={() => setSelectedAmount('custom')}
                  />
                </div>

                {/* Custom Amount Input */}
                {selectedAmount === 'custom' && (
                  <div className="mt-3 relative">
                    <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="0.01"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full rounded-lg border border-border-light bg-background-secondary py-3 pl-10 pr-4 text-text-primary outline-none focus:border-twitter-blue"
                    />
                  </div>
                )}

                {selectedAmount === 'custom' && customAmount && !isValidAmount && (
                  <p className="mt-2 text-sm text-red-500">
                    Amount must be between $1 and $1,000
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  <PaymentMethodButton
                    method="card"
                    selected={paymentMethod === 'card'}
                    onClick={() => setPaymentMethod('card')}
                  />
                  <PaymentMethodButton
                    method="crypto"
                    selected={paymentMethod === 'crypto'}
                    onClick={() => setPaymentMethod('crypto')}
                  />
                </div>
              </div>

              {/* Optional Message */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Add a Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Say something nice..."
                  maxLength={280}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border-light bg-background-secondary p-3 text-text-primary outline-none focus:border-twitter-blue placeholder:text-text-tertiary"
                />
                <p className="mt-1 text-right text-xs text-text-tertiary">
                  {message.length}/280
                </p>
              </div>

              {/* Error Message */}
              {tipMutation.isError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-red-500">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm">
                    {tipMutation.error?.message ?? 'Failed to send tip. Please try again.'}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isValidAmount || tipMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-green-500 py-3 font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tipMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <DollarSign className="h-5 w-5" />
                    Send ${tipAmount.toFixed(2)} Tip
                  </>
                )}
              </button>

              {/* Disclaimer */}
              <p className="text-center text-xs text-text-tertiary">
                Tips are processed securely via {paymentMethod === 'card' ? 'Stripe' : 'WalletConnect'}.
                A 5% platform fee applies. Tips are non-refundable.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

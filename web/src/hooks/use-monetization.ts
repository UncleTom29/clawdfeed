// ---------------------------------------------------------------------------
// ClawdFeed Monetization Hooks - React Query hooks for subscription & tips
// ---------------------------------------------------------------------------

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import {
  apiClient,
  SubscriptionData,
  InvoiceData,
  TipResponse,
} from '@/lib/api-client';
import { getStripe } from '@/lib/stripe';

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const subscriptionKeys = {
  all: ['subscription'] as const,
  current: () => [...subscriptionKeys.all, 'current'] as const,
  invoices: () => [...subscriptionKeys.all, 'invoices'] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SubscriptionQueryOptions = Omit<
  UseQueryOptions<SubscriptionData, Error>,
  'queryKey' | 'queryFn'
>;

type InvoicesQueryOptions = Omit<
  UseQueryOptions<InvoiceData[], Error>,
  'queryKey' | 'queryFn'
>;

export type SubscriptionPlan = 'pro' | 'pro_plus';

interface CreateCheckoutVariables {
  plan: SubscriptionPlan;
}

interface TipVariables {
  agentHandle: string;
  amount: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the current user's subscription plan.
 */
export function useSubscription(options?: SubscriptionQueryOptions) {
  return useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: async () => {
      return apiClient.subscription.getCurrentPlan();
    },
    ...options,
  });
}

/**
 * Fetch the user's invoice history.
 */
export function useInvoices(options?: InvoicesQueryOptions) {
  return useQuery({
    queryKey: subscriptionKeys.invoices(),
    queryFn: async () => {
      return apiClient.subscription.getInvoices();
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Mutation Hooks
// ---------------------------------------------------------------------------

/**
 * Create a Stripe checkout session and redirect to payment.
 */
export function useCreateCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plan }: CreateCheckoutVariables) => {
      // Create checkout session on the server
      const { url } = await apiClient.subscription.createCheckoutSession(plan);

      // Get Stripe instance
      const stripe = await getStripe();

      if (!stripe) {
        throw new Error('Stripe is not configured');
      }

      // Redirect to Stripe Checkout
      // If URL is returned, redirect directly (for hosted checkout)
      if (url) {
        window.location.href = url;
        return { redirected: true };
      }

      throw new Error('No checkout URL returned');
    },
    onSuccess: () => {
      // Invalidate subscription data after successful checkout initiation
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}

/**
 * Cancel the current subscription.
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.subscription.cancelSubscription();
    },
    onMutate: async () => {
      // Optimistically update subscription status
      await queryClient.cancelQueries({ queryKey: subscriptionKeys.current() });

      const previousData = queryClient.getQueryData<SubscriptionData>(
        subscriptionKeys.current()
      );

      if (previousData) {
        queryClient.setQueryData<SubscriptionData>(subscriptionKeys.current(), {
          ...previousData,
          cancelAtPeriodEnd: true,
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(subscriptionKeys.current(), context.previousData);
      }
    },
    onSettled: () => {
      // Refetch subscription data
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}

/**
 * Send a tip to an agent.
 */
export function useTip() {
  return useMutation({
    mutationFn: async ({
      agentHandle,
      amount,
      message,
    }: TipVariables): Promise<TipResponse> => {
      return apiClient.monetization.tip({
        agent_handle: agentHandle,
        amount_usd: amount,
        message,
      });
    },
  });
}

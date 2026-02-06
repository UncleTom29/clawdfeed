import type { PaginationInput } from '../utils/validation.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

interface SubscriptionData {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  features: string[];
}

interface InvoiceData {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  createdAt: string;
  paidAt: string | null;
  description: string;
  receiptUrl: string | null;
}

interface CheckoutSession {
  sessionId: string;
  url: string;
}

interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Mock data store
// ---------------------------------------------------------------------------

const subscriptions: Map<string, SubscriptionData> = new Map();
const invoices: Map<string, InvoiceData[]> = new Map();

// Plan features
const planFeatures: Record<SubscriptionPlan, string[]> = {
  free: [
    'Basic feed access',
    'Follow up to 100 agents',
    'Like and repost',
    'Basic notifications',
  ],
  pro: [
    'Everything in Free',
    'Unlimited follows',
    'Direct messages',
    'Priority feed algorithm',
    'Advanced analytics',
    'Custom profile themes',
    'Early access to features',
  ],
  enterprise: [
    'Everything in Pro',
    'API access',
    'Custom agent integrations',
    'Dedicated support',
    'Team management',
    'Bulk operations',
  ],
};

// ---------------------------------------------------------------------------
// Get current subscription
// ---------------------------------------------------------------------------

export async function getSubscription(userId: string): Promise<SubscriptionData> {
  // Check if user has a subscription
  if (subscriptions.has(userId)) {
    return subscriptions.get(userId)!;
  }

  // Return free tier by default
  const freeSub: SubscriptionData = {
    id: `sub_free_${userId}`,
    plan: 'free',
    status: 'active',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    features: planFeatures.free,
  };

  return freeSub;
}

// ---------------------------------------------------------------------------
// Create checkout session
// ---------------------------------------------------------------------------

export async function createCheckoutSession(
  userId: string,
  plan: SubscriptionPlan,
  successUrl: string,
  cancelUrl: string,
): Promise<CheckoutSession> {
  // In production, this would create a real Stripe checkout session
  // For now, return a mock session

  const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Mock Stripe checkout URL
  const url = `https://checkout.stripe.com/pay/${sessionId}?success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;

  return {
    sessionId,
    url,
  };
}

// ---------------------------------------------------------------------------
// Cancel subscription
// ---------------------------------------------------------------------------

export async function cancelSubscription(
  userId: string,
): Promise<{ success: boolean; cancelAt: string }> {
  const subscription = subscriptions.get(userId);

  if (!subscription) {
    const error = new Error('No active subscription found') as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  if (subscription.plan === 'free') {
    const error = new Error('Cannot cancel free tier') as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }

  // Mark subscription to cancel at period end
  subscription.cancelAtPeriodEnd = true;
  subscriptions.set(userId, subscription);

  return {
    success: true,
    cancelAt: subscription.currentPeriodEnd,
  };
}

// ---------------------------------------------------------------------------
// Resume subscription (undo cancellation)
// ---------------------------------------------------------------------------

export async function resumeSubscription(
  userId: string,
): Promise<{ success: boolean }> {
  const subscription = subscriptions.get(userId);

  if (!subscription) {
    const error = new Error('No subscription found') as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  subscription.cancelAtPeriodEnd = false;
  subscriptions.set(userId, subscription);

  return { success: true };
}

// ---------------------------------------------------------------------------
// Get invoices
// ---------------------------------------------------------------------------

export async function getInvoices(
  userId: string,
  pagination: PaginationInput,
): Promise<PaginatedResult<InvoiceData>> {
  // Get or create mock invoices
  if (!invoices.has(userId)) {
    invoices.set(userId, [
      {
        id: 'inv_001',
        amount: 999,
        currency: 'usd',
        status: 'paid',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'ClawdFeed Pro - Monthly',
        receiptUrl: 'https://pay.stripe.com/receipts/inv_001',
      },
      {
        id: 'inv_002',
        amount: 999,
        currency: 'usd',
        status: 'paid',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'ClawdFeed Pro - Monthly',
        receiptUrl: 'https://pay.stripe.com/receipts/inv_002',
      },
    ]);
  }

  const userInvoices = invoices.get(userId)!;

  // Apply pagination
  const limit = pagination.limit ?? 25;
  const startIndex = pagination.cursor ? parseInt(pagination.cursor, 10) : 0;
  const endIndex = startIndex + limit;
  const paginatedData = userInvoices.slice(startIndex, endIndex);
  const hasMore = endIndex < userInvoices.length;

  return {
    data: paginatedData,
    nextCursor: hasMore ? String(endIndex) : null,
    hasMore,
  };
}

// ---------------------------------------------------------------------------
// Handle Stripe webhook (upgrade subscription)
// ---------------------------------------------------------------------------

export async function handleSubscriptionUpdate(
  userId: string,
  stripeSubscriptionId: string,
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  periodStart: Date,
  periodEnd: Date,
): Promise<SubscriptionData> {
  const subscription: SubscriptionData = {
    id: stripeSubscriptionId,
    plan,
    status,
    currentPeriodStart: periodStart.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    features: planFeatures[plan],
  };

  subscriptions.set(userId, subscription);

  return subscription;
}

// ---------------------------------------------------------------------------
// Check if user has Pro
// ---------------------------------------------------------------------------

export async function hasPro(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);
  return subscription.plan === 'pro' || subscription.plan === 'enterprise';
}

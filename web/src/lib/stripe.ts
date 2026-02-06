// ---------------------------------------------------------------------------
// ClawdFeed Stripe Client - Lazy-loaded Stripe.js initialization
// ---------------------------------------------------------------------------

import { loadStripe, Stripe } from '@stripe/stripe-js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// ---------------------------------------------------------------------------
// Stripe Instance
// ---------------------------------------------------------------------------

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get the Stripe instance, lazy-loading the Stripe.js library.
 * Returns null if the publishable key is not configured.
 *
 * @example
 * const stripe = await getStripe();
 * if (stripe) {
 *   await stripe.redirectToCheckout({ sessionId });
 * }
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!STRIPE_PUBLISHABLE_KEY) {
      console.warn(
        'Stripe publishable key is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment.'
      );
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
    }
  }

  return stripePromise;
}

/**
 * Reset the Stripe instance (useful for testing).
 */
export function resetStripe(): void {
  stripePromise = null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { Stripe } from '@stripe/stripe-js';

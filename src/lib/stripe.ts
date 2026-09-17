import Stripe from 'stripe';
import { decryptToken } from './encryption';

/**
 * Root Stripe instance using platform API Key
 */
export const stripe = new Stripe(process.env.STRIPE_API_KEY || 'sk_test_mock_reetayn_key', {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
  appInfo: {
    name: 'Reetayn',
    version: '0.0.1',
    url: 'https://reetayn.com',
  },
});

/**
 * Returns a Stripe client scoped to a connected merchant account or access token.
 */
export function getMerchantStripe(options?: {
  stripeAccountId?: string | null;
  encryptedAccessToken?: string | null;
}): Stripe {
  if (options?.encryptedAccessToken) {
    const decryptedKey = decryptToken(options.encryptedAccessToken);
    return new Stripe(decryptedKey, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    });
  }

  if (options?.stripeAccountId) {
    return new Stripe(process.env.STRIPE_API_KEY || 'sk_test_mock_reetayn_key', {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
      stripeAccount: options.stripeAccountId,
    });
  }

  return stripe;
}

/**
 * Generates a single-use Customer Portal session specifically targeted
 * for instant 1-click payment method updates without requiring customer login.
 */
export async function createRescuePortalSession(params: {
  stripeClient: Stripe;
  stripeCustomerId: string;
  returnUrl?: string;
}): Promise<{ url: string; id: string }> {
  const defaultReturnUrl =
    params.returnUrl ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://reetayn.com'}/rescue/success`;

  const session = await params.stripeClient.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: defaultReturnUrl,
    flow_data: {
      type: 'payment_method_update',
    },
  });

  return {
    url: session.url,
    id: session.id,
  };
}

/**
 * Verifies webhook signatures with defense against secret rotation.
 * Checks primary secret, fallback secrets (comma-delimited), and optional merchant secret.
 */
export function verifyStripeWebhookWithRotation(
  rawBody: string | Buffer,
  signature: string,
  candidateSecrets: (string | null | undefined)[]
): Stripe.Event {
  const secretsToTest = candidateSecrets
    .filter((s): s is string => Boolean(s && s.trim().length > 0))
    .flatMap((s) => s.split(',').map((item) => item.trim()));

  if (secretsToTest.length === 0) {
    throw new Error('No webhook secrets configured for signature verification.');
  }

  let lastError: Error | null = null;

  for (const secret of secretsToTest) {
    try {
      return stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err: unknown) {
      lastError = err as Error;
      // Continue to next candidate secret (secret rotation support)
    }
  }

  throw new Error(`Webhook signature verification failed for all available secrets: ${lastError?.message}`);
}

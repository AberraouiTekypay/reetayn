import { describe, it, expect, vi } from 'vitest';
import Stripe from 'stripe';
import { verifyStripeWebhookWithRotation } from '../src/lib/stripe';

describe('Stripe Webhook Signature Verification & Secret Rotation Defense', () => {
  const secretA = 'whsec_test_secret_alpha_12345';
  const secretB = 'whsec_test_secret_bravo_67890';
  const payload = JSON.stringify({ id: 'evt_test_123', object: 'event', type: 'invoice.payment_failed' });

  it('successfully verifies signature with primary secret', () => {
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: secretA,
    });

    const event = verifyStripeWebhookWithRotation(payload, header, [secretA, secretB]);
    expect(event.id).toBe('evt_test_123');
    expect(event.type).toBe('invoice.payment_failed');
  });

  it('successfully verifies signature with secondary secret during rotation', () => {
    // Generated using rotated secondary secret
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: secretB,
    });

    // candidate secrets: [secretA (expired/old), secretB (new active)]
    const event = verifyStripeWebhookWithRotation(payload, header, [secretA, secretB]);
    expect(event.id).toBe('evt_test_123');
    expect(event.type).toBe('invoice.payment_failed');
  });

  it('supports comma-separated candidate secrets in environment variable', () => {
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: secretB,
    });

    const combined = `${secretA}, ${secretB}`;
    const event = verifyStripeWebhookWithRotation(payload, header, [combined]);
    expect(event.id).toBe('evt_test_123');
  });

  it('rejects tampered or unauthorized payloads with all secrets', () => {
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: 'tampered payload',
      secret: 'whsec_unauthorized',
    });

    expect(() => {
      verifyStripeWebhookWithRotation(payload, header, [secretA, secretB]);
    }).toThrow(/Webhook signature verification failed/);
  });
});

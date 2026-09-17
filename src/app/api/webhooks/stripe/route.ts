import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { stripe, getMerchantStripe, createRescuePortalSession, verifyStripeWebhookWithRotation } from '@/lib/stripe';
import { calculateChurnRisk } from '@/lib/scoring';
import { RiskTier, RescueStatus } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Helper to ensure a Merchant record exists for the Stripe account
 */
async function resolveMerchant(stripeAccountId?: string | null) {
  const accountId = stripeAccountId || process.env.STRIPE_ACCOUNT_ID || 'acct_reetayn_primary';
  
  let merchant = await prisma.merchant.findUnique({
    where: { stripeAccountId: accountId },
  });

  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        stripeAccountId: accountId,
        accessTokenEncrypted: 'mock_encrypted_primary_token',
        settingsAutoRescue: true,
        rescueThresholdDays: 14,
        isActive: true,
      },
    });
  }

  return merchant;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let rawBody: string;

  try {
    rawBody = await req.text();
  } catch (err: unknown) {
    console.error('[Stripe Webhook] Error reading raw body:', err);
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // 1. Signature Verification with Secret Rotation Defense
  let event: Stripe.Event;
  try {
    const candidateSecrets = [
      process.env.STRIPE_WEBHOOK_SECRET,
      process.env.STRIPE_WEBHOOK_SECRET_SECONDARY, // Secret rotation candidate
    ];

    event = verifyStripeWebhookWithRotation(rawBody, signature, candidateSecrets);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[Stripe Webhook] Signature verification error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  // Handle Event Asynchronously / Fast to guarantee 200 OK within 250ms
  try {
    const stripeAccountId = event.account || null;
    const merchant = await resolveMerchant(stripeAccountId);
    const merchantStripe = getMerchantStripe({
      stripeAccountId,
      encryptedAccessToken: merchant.accessTokenEncrypted,
    });

    switch (event.type) {
      // -------------------------------------------------------------
      // EVENT: customer.subscription.updated / created
      // -------------------------------------------------------------
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

        if (!customerId) break;

        const nextRenewalDate = new Date(subscription.current_period_end * 1000);
        let cardExpMonth: number | null = null;
        let cardExpYear: number | null = null;
        let cardLast4: string | null = null;
        let cardBrand: string | null = null;

        // Retrieve default payment method details
        const defaultPmId = subscription.default_payment_method || subscription.customer;
        if (typeof defaultPmId === 'string' && defaultPmId.startsWith('pm_')) {
          try {
            const pm = await merchantStripe.paymentMethods.retrieve(defaultPmId);
            if (pm.card) {
              cardExpMonth = pm.card.exp_month;
              cardExpYear = pm.card.exp_year;
              cardLast4 = pm.card.last4;
              cardBrand = pm.card.brand;
            }
          } catch (pmErr) {
            console.warn('[Stripe Webhook] Could not retrieve default payment method:', pmErr);
          }
        }

        // Fetch customer record if present to retain consecutive failures
        const existingCustomer = await prisma.trackedCustomer.findUnique({
          where: {
            merchantId_stripeCustomerId: {
              merchantId: merchant.id,
              stripeCustomerId: customerId,
            },
          },
        });

        const consecutiveFailures = existingCustomer?.consecutiveFailures ?? 0;
        const lastDeclineCode = existingCustomer?.lastDeclineCode ?? null;
        const lastDeclineAt = existingCustomer?.lastDeclineAt ?? null;

        // Calculate Churn Risk Heuristic
        const riskResult = calculateChurnRisk({
          cardExpMonth,
          cardExpYear,
          consecutiveFailures,
          lastDeclineCode,
          lastDeclineAt,
          nextRenewalDate,
        });

        // Calculate subscription MRR (in cents)
        const currentMrrCents = subscription.items.data.reduce((total, item) => {
          const unitAmount = item.price.unit_amount || 0;
          const quantity = item.quantity || 1;
          const interval = item.price.recurring?.interval || 'month';
          const intervalCount = item.price.recurring?.interval_count || 1;

          let monthlyCents = unitAmount * quantity;
          if (interval === 'year') {
            monthlyCents = Math.round(monthlyCents / (12 * intervalCount));
          } else if (interval === 'week') {
            monthlyCents = Math.round(monthlyCents * (52 / 12) / intervalCount);
          } else if (interval === 'day') {
            monthlyCents = Math.round(monthlyCents * 30 / intervalCount);
          }
          return total + monthlyCents;
        }, 0);

        // Fetch Customer metadata/email if missing
        let email: string | null = existingCustomer?.email ?? null;
        let name: string | null = existingCustomer?.name ?? null;
        if (!email && typeof customerId === 'string') {
          try {
            const stripeCust = await merchantStripe.customers.retrieve(customerId);
            if (!stripeCust.deleted) {
              email = stripeCust.email || null;
              name = stripeCust.name || null;
            }
          } catch (cErr) {
            console.warn('[Stripe Webhook] Customer retrieve error:', cErr);
          }
        }

        // Upsert TrackedCustomer leveraging composite index key
        await prisma.trackedCustomer.upsert({
          where: {
            merchantId_stripeCustomerId: {
              merchantId: merchant.id,
              stripeCustomerId: customerId,
            },
          },
          create: {
            merchantId: merchant.id,
            stripeCustomerId: customerId,
            email,
            name,
            currency: subscription.currency || 'usd',
            currentMrrCents,
            cardLast4,
            cardBrand,
            cardExpMonth,
            cardExpYear,
            churnRiskTier: riskResult.tier as RiskTier,
            consecutiveFailures,
            lastDeclineCode,
            lastDeclineAt,
            nextRenewalDate,
          },
          update: {
            currentMrrCents,
            nextRenewalDate,
            ...(cardExpMonth ? { cardExpMonth, cardExpYear, cardLast4, cardBrand } : {}),
            churnRiskTier: riskResult.tier as RiskTier,
            email: email || undefined,
            name: name || undefined,
          },
        });

        break;
      }

      // -------------------------------------------------------------
      // EVENT: invoice.payment_failed
      // -------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;

        if (!customerId) break;

        // Ingest charge failure_code / decline_code
        let declineCode = 'payment_failed';
        if (invoice.last_finalization_error?.code) {
          declineCode = invoice.last_finalization_error.code;
        } else if (invoice.charge && typeof invoice.charge === 'string') {
          try {
            const charge = await merchantStripe.charges.retrieve(invoice.charge);
            if (charge.failure_code) {
              declineCode = charge.failure_code;
            } else if (charge.outcome?.reason) {
              declineCode = charge.outcome.reason;
            }
          } catch (cErr) {
            console.warn('[Stripe Webhook] Could not retrieve charge details:', cErr);
          }
        }

        const now = new Date();

        // Increment consecutiveFailures and escalate churnRiskTier to CRITICAL
        const trackedCustomer = await prisma.trackedCustomer.upsert({
          where: {
            merchantId_stripeCustomerId: {
              merchantId: merchant.id,
              stripeCustomerId: customerId,
            },
          },
          create: {
            merchantId: merchant.id,
            stripeCustomerId: customerId,
            email: invoice.customer_email || null,
            name: invoice.customer_name || null,
            currency: invoice.currency || 'usd',
            currentMrrCents: invoice.amount_due || 0,
            consecutiveFailures: 1,
            lastDeclineCode: declineCode,
            lastDeclineAt: now,
            churnRiskTier: RiskTier.CRITICAL,
          },
          update: {
            consecutiveFailures: { increment: 1 },
            lastDeclineCode: declineCode,
            lastDeclineAt: now,
            churnRiskTier: RiskTier.CRITICAL,
          },
        });

        // If merchant.settingsAutoRescue == true, generate 1-click rescue portal session
        if (merchant.settingsAutoRescue) {
          try {
            const session = await createRescuePortalSession({
              stripeClient: merchantStripe,
              stripeCustomerId: customerId,
            });

            // Record action in RescueLog
            await prisma.rescueLog.create({
              data: {
                merchantId: merchant.id,
                stripeCustomerId: customerId,
                actionType: 'PORTAL_LINK_GENERATION',
                status: RescueStatus.DISPATCHED,
                failureReason: declineCode,
              },
            });

            // Store single-use portal URL on customer record
            await prisma.trackedCustomer.update({
              where: {
                merchantId_stripeCustomerId: {
                  merchantId: merchant.id,
                  stripeCustomerId: customerId,
                },
              },
              data: {
                lastRescuePortalUrl: session.url,
              },
            });
          } catch (rescueErr) {
            console.error('[Stripe Webhook] Auto rescue portal link generation error:', rescueErr);
            await prisma.rescueLog.create({
              data: {
                merchantId: merchant.id,
                stripeCustomerId: customerId,
                actionType: 'PORTAL_LINK_GENERATION',
                status: RescueStatus.PENDING,
                failureReason: declineCode,
              },
            });
          }
        }

        break;
      }

      // -------------------------------------------------------------
      // EVENT: payment_method.attached / updated
      // -------------------------------------------------------------
      case 'payment_method.attached':
      case 'payment_method.updated': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        const customerId = typeof paymentMethod.customer === 'string'
          ? paymentMethod.customer
          : paymentMethod.customer?.id;

        if (!customerId) break;

        const cardDetails = paymentMethod.card;

        // Reset consecutiveFailures = 0, recalculate churnRiskTier to LOW
        await prisma.trackedCustomer.updateMany({
          where: {
            merchantId: merchant.id,
            stripeCustomerId: customerId,
          },
          data: {
            consecutiveFailures: 0,
            churnRiskTier: RiskTier.LOW,
            ...(cardDetails
              ? {
                  cardExpMonth: cardDetails.exp_month,
                  cardExpYear: cardDetails.exp_year,
                  cardLast4: cardDetails.last4,
                  cardBrand: cardDetails.brand,
                }
              : {}),
          },
        });

        // Mark matching pending or dispatched RescueLog as RESOLVED
        await prisma.rescueLog.updateMany({
          where: {
            merchantId: merchant.id,
            stripeCustomerId: customerId,
            status: { in: [RescueStatus.PENDING, RescueStatus.DISPATCHED] },
          },
          data: {
            status: RescueStatus.RESOLVED,
            resolvedAt: new Date(),
          },
        });

        break;
      }

      default:
        // Ignore other Stripe event types
        break;
    }

    const duration = Date.now() - startTime;
    return NextResponse.json({
      received: true,
      eventType: event.type,
      durationMs: duration,
    });
  } catch (processErr: unknown) {
    console.error('[Stripe Webhook] Error processing event payload:', processErr);
    // Return 200 to acknowledge receipt and prevent Stripe retry storm if business logic threw
    return NextResponse.json({
      received: true,
      error: 'Processing encountered an error',
    }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMerchantStripe } from '@/lib/stripe';
import { calculateChurnRisk, RiskTier } from '@/lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') || searchParams.get('stripeCustomerId');
    const merchantId = searchParams.get('merchantId');
    const stripeAccountId = searchParams.get('stripeAccountId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId query parameter is required' },
        { status: 400 }
      );
    }

    // Resolve merchant
    let merchant = null;
    if (merchantId) {
      merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    } else if (stripeAccountId) {
      merchant = await prisma.merchant.findUnique({ where: { stripeAccountId } });
    } else {
      merchant = await prisma.merchant.findFirst({ where: { isActive: true } });
    }

    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: {
          stripeAccountId: stripeAccountId || process.env.STRIPE_ACCOUNT_ID || 'acct_reetayn_primary',
          accessTokenEncrypted: 'mock_encrypted_primary_token',
          settingsAutoRescue: true,
          rescueThresholdDays: 14,
          isActive: true,
        },
      });
    }

    // 1. Check if customer is already tracked in DB using composite index
    let trackedCustomer = await prisma.trackedCustomer.findUnique({
      where: {
        merchantId_stripeCustomerId: {
          merchantId: merchant.id,
          stripeCustomerId: customerId,
        },
      },
    });

    // 2. If not tracked or requested fresh, perform live retrieval from Stripe
    if (!trackedCustomer) {
      const merchantStripe = getMerchantStripe({
        stripeAccountId: merchant.stripeAccountId,
        encryptedAccessToken: merchant.accessTokenEncrypted,
      });

      try {
        const stripeCustomer = await merchantStripe.customers.retrieve(customerId, {
          expand: ['subscriptions.data.default_payment_method'],
        });

        if (!stripeCustomer.deleted) {
          const activeSub = (stripeCustomer as any).subscriptions?.data?.[0];
          let cardExpMonth: number | null = null;
          let cardExpYear: number | null = null;
          let cardLast4: string | null = null;
          let cardBrand: string | null = null;

          const defaultPm = activeSub?.default_payment_method;
          if (defaultPm && typeof defaultPm === 'object' && defaultPm.card) {
            cardExpMonth = defaultPm.card.exp_month;
            cardExpYear = defaultPm.card.exp_year;
            cardLast4 = defaultPm.card.last4;
            cardBrand = defaultPm.card.brand;
          }

          const nextRenewalDate = activeSub?.current_period_end
            ? new Date(activeSub.current_period_end * 1000)
            : null;

          const riskResult = calculateChurnRisk({
            cardExpMonth,
            cardExpYear,
            consecutiveFailures: 0,
            nextRenewalDate,
          });

          // Save tracked customer
          trackedCustomer = await prisma.trackedCustomer.create({
            data: {
              merchantId: merchant.id,
              stripeCustomerId: customerId,
              email: stripeCustomer.email || null,
              name: stripeCustomer.name || null,
              currency: activeSub?.currency || 'usd',
              currentMrrCents: activeSub?.items?.data?.[0]?.price?.unit_amount || 0,
              cardLast4,
              cardBrand,
              cardExpMonth,
              cardExpYear,
              churnRiskTier: riskResult.tier as any,
              consecutiveFailures: 0,
              nextRenewalDate,
            },
          });
        }
      } catch (stripeErr) {
        console.warn('[Customer Risk API] Stripe lookup warning:', stripeErr);
      }
    }

    // Run scoring on latest data
    const riskResult = calculateChurnRisk({
      cardExpMonth: trackedCustomer?.cardExpMonth,
      cardExpYear: trackedCustomer?.cardExpYear,
      consecutiveFailures: trackedCustomer?.consecutiveFailures ?? 0,
      lastDeclineCode: trackedCustomer?.lastDeclineCode,
      lastDeclineAt: trackedCustomer?.lastDeclineAt,
      nextRenewalDate: trackedCustomer?.nextRenewalDate,
    });

    return NextResponse.json({
      customerId,
      merchantId: merchant.id,
      name: trackedCustomer?.name || 'Valued Subscriber',
      email: trackedCustomer?.email || null,
      currency: trackedCustomer?.currency || 'usd',
      currentMrrCents: trackedCustomer?.currentMrrCents || 0,
      cardLast4: trackedCustomer?.cardLast4 || null,
      cardBrand: trackedCustomer?.cardBrand || null,
      cardExpMonth: trackedCustomer?.cardExpMonth || null,
      cardExpYear: trackedCustomer?.cardExpYear || null,
      nextRenewalDate: trackedCustomer?.nextRenewalDate?.toISOString() || null,
      consecutiveFailures: trackedCustomer?.consecutiveFailures || 0,
      lastDeclineCode: trackedCustomer?.lastDeclineCode || null,
      lastRescuePortalUrl: trackedCustomer?.lastRescuePortalUrl || null,
      riskTier: riskResult.tier,
      riskScore: riskResult.score,
      badgeLabel: riskResult.badgeLabel,
      badgeVariant: riskResult.badgeVariant,
      reason: riskResult.reason,
      details: riskResult.details,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Customer Risk API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

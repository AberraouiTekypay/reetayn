import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMerchantStripe, createRescuePortalSession } from '@/lib/stripe';
import { RescueStatus } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stripeCustomerId, merchantId, returnUrl, actionType = 'MANUAL_DRAWER_TRIGGER' } = body;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'stripeCustomerId is required' },
        { status: 400 }
      );
    }

    // Resolve merchant
    let merchant = merchantId
      ? await prisma.merchant.findUnique({ where: { id: merchantId } })
      : await prisma.merchant.findFirst({ where: { isActive: true } });

    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: {
          stripeAccountId: process.env.STRIPE_ACCOUNT_ID || 'acct_reetayn_primary',
          accessTokenEncrypted: 'mock_encrypted_primary_token',
          settingsAutoRescue: true,
          rescueThresholdDays: 14,
          isActive: true,
        },
      });
    }

    const merchantStripe = getMerchantStripe({
      stripeAccountId: merchant.stripeAccountId,
      encryptedAccessToken: merchant.accessTokenEncrypted,
    });

    // Create a 1-click self-serve billing portal session for payment method update
    const session = await createRescuePortalSession({
      stripeClient: merchantStripe,
      stripeCustomerId,
      returnUrl,
    });

    // Record action in RescueLog
    const log = await prisma.rescueLog.create({
      data: {
        merchantId: merchant.id,
        stripeCustomerId,
        actionType,
        status: RescueStatus.DISPATCHED,
      },
    });

    // Update customer record with latest generated rescue URL
    await prisma.trackedCustomer.updateMany({
      where: {
        merchantId: merchant.id,
        stripeCustomerId,
      },
      data: {
        lastRescuePortalUrl: session.url,
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      logId: log.id,
      customerId: stripeCustomerId,
      actionType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Generate Link API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

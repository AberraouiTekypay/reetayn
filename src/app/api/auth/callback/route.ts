import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { encryptToken } from '@/lib/encryption';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('[Stripe Auth Callback] Error from Stripe:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(errorDescription || error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard?error=Missing+authorization+code', req.url)
    );
  }

  try {
    // Exchange the authorization code for an access token
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const connectedAccountId = response.stripe_user_id;
    const accessToken = response.access_token;
    const publishableKey = response.stripe_publishable_key;

    if (!connectedAccountId || !accessToken) {
      throw new Error('OAuth token response missing account ID or access token');
    }

    const encryptedToken = encryptToken(accessToken);

    // Upsert merchant record with encrypted token
    await prisma.merchant.upsert({
      where: { stripeAccountId: connectedAccountId },
      create: {
        stripeAccountId: connectedAccountId,
        stripePublishableKey: publishableKey || null,
        accessTokenEncrypted: encryptedToken,
        settingsAutoRescue: true,
        rescueThresholdDays: 14,
        isActive: true,
      },
      update: {
        stripePublishableKey: publishableKey || null,
        accessTokenEncrypted: encryptedToken,
        isActive: true,
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard?connected=true&account=' + connectedAccountId, req.url)
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown OAuth error';
    console.error('[Stripe Auth Callback] Exchange error:', message);
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, req.url)
    );
  }
}

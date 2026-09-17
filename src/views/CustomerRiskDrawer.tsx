import React, { useEffect, useState, useCallback } from 'react';
import {
  ContextView,
  Box,
  Button,
  Banner,
  Badge,
  Inline,
  Divider,
  PropertyList,
  PropertyListItem,
  Spinner,
  Link,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { clipboardWriteText } from '@stripe/ui-extension-sdk/clipboard';

export interface CustomerRiskDrawerProps extends Partial<ExtensionContextValue> {
  // Allow passing customerId directly or via environment
  customerId?: string;
}

interface RiskProfile {
  customerId: string;
  name: string;
  email: string | null;
  currency: string;
  currentMrrCents: number;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  nextRenewalDate: string | null;
  consecutiveFailures: number;
  lastDeclineCode: string | null;
  lastRescuePortalUrl: string | null;
  riskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  badgeLabel: string;
  badgeVariant: 'critical' | 'warning' | 'success' | 'neutral';
  reason: string;
}

export const CustomerRiskDrawer: React.FC<CustomerRiskDrawerProps> = ({
  environment,
  userContext,
  customerId: directCustomerId,
}) => {
  const customerId =
    directCustomerId ||
    environment?.objectContext?.id ||
    '';

  const stripeAccountId = userContext?.account?.id;

  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [generatingLink, setGeneratingLink] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRiskProfile = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams({ customerId });
      if (stripeAccountId) {
        params.append('stripeAccountId', stripeAccountId);
      }

      const res = await fetch(`https://reetayn.com/api/customers/risk?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load risk score (${res.status})`);
      }
      const data = await res.json();
      setProfile(data);
    } catch (err: unknown) {
      console.error('[CustomerRiskDrawer] Fetch error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to contact Reetayn intelligence server'
      );
    } finally {
      setLoading(false);
    }
  }, [customerId, stripeAccountId]);

  useEffect(() => {
    fetchRiskProfile();
  }, [fetchRiskProfile]);

  const handleGenerateRecoveryLink = async () => {
    if (!customerId) return;

    try {
      setGeneratingLink(true);
      setErrorMessage(null);

      const res = await fetch('https://reetayn.com/api/rescue/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeCustomerId: customerId,
          stripeAccountId,
          actionType: 'MANUAL_DRAWER_TRIGGER',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate recovery link');
      }

      const { url } = await res.json();

      // Copy recovery URL to clipboard using Stripe SDK clipboard utility
      try {
        await clipboardWriteText(url);
      } catch (clipErr) {
        // Fallback to navigator clipboard if available
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
        }
      }

      setCopiedUrl(url);
    } catch (err: unknown) {
      console.error('[CustomerRiskDrawer] Link generation error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate recovery link');
    } finally {
      setGeneratingLink(false);
    }
  };

  // Helper for Badge styling according to specification:
  // CRITICAL: Red badge ("Payment At Immediate Risk")
  // HIGH: Amber badge ("Expiring Before Next Cycle")
  // LOW: Green badge ("Payment Method Healthy")
  const renderBadge = () => {
    if (!profile) return null;

    switch (profile.riskTier) {
      case 'CRITICAL':
        return (
          <Badge type="negative">
            Payment At Immediate Risk
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge type="warning">
            Expiring Before Next Cycle
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge type="warning">
            Expiring Soon (30-60 Days)
          </Badge>
        );
      case 'LOW':
      default:
        return (
          <Badge type="positive">
            Payment Method Healthy
          </Badge>
        );
    }
  };

  return (
    <ContextView
      title="Reetayn Churn Intelligence"
      actions={
        <Link
          href="https://reetayn.com/dashboard"
          target="_blank"
          type="secondary"
        >
          Open Reetayn
        </Link>
      }
    >
      <Box css={{ stack: 'y', gap: 'large', padding: 'medium' }}>
        {/* Error Banner */}
        {errorMessage && (
          <Banner
            type="critical"
            title="Intelligence Lookup Failed"
            description={errorMessage}
          />
        )}

        {/* Success Copy Banner */}
        {copiedUrl && (
          <Banner
            type="default"
            title="Instant Recovery Link Copied"
            description="Single-use payment method update link copied to clipboard. Send directly to subscriber."
          />
        )}

        {/* Loading State */}
        {loading && (
          <Box css={{ alignX: 'center', padding: 'xlarge' }}>
            <Spinner size="large" />
          </Box>
        )}

        {/* Main Content */}
        {!loading && profile && (
          <>
            {/* Risk Tier Header Badge */}
            <Box css={{ stack: 'y', gap: 'small' }}>
              <Inline css={{ alignY: 'center', gap: 'small' }}>
                {renderBadge()}
              </Inline>
              <Box css={{ color: 'secondary' }}>
                {profile.reason}
              </Box>
            </Box>

            <Divider />

            {/* Diagnostic Details */}
            <PropertyList>
              <PropertyListItem
                label="Risk Score"
                value={`${profile.riskScore} / 100`}
              />
              <PropertyListItem
                label="Payment Method"
                value={
                  profile.cardLast4
                    ? `${(profile.cardBrand || 'Card').toUpperCase()} •••• ${profile.cardLast4} (Exp: ${profile.cardExpMonth}/${profile.cardExpYear})`
                    : 'No default card on file'
                }
              />
              <PropertyListItem
                label="Next Billing Cycle"
                value={
                  profile.nextRenewalDate
                    ? new Date(profile.nextRenewalDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'No active renewal date'
                }
              />
              <PropertyListItem
                label="Consecutive Failures"
                value={String(profile.consecutiveFailures)}
              />
              {profile.lastDeclineCode && (
                <PropertyListItem
                  label="Last Decline Reason"
                  value={profile.lastDeclineCode}
                />
              )}
            </PropertyList>

            <Divider />

            {/* Instant Recovery Link Action */}
            <Box css={{ stack: 'y', gap: 'small' }}>
              <Button
                type="primary"
                disabled={generatingLink}
                onPress={handleGenerateRecoveryLink}
              >
                {generatingLink ? 'Generating Recovery Link...' : 'Generate Instant Recovery Link'}
              </Button>
              <Box css={{ color: 'secondary' }}>
                Generates a secure, 1-click self-serve card update URL without requiring subscriber login.
              </Box>
            </Box>
          </>
        )}
      </Box>
    </ContextView>
  );
};

export default CustomerRiskDrawer;

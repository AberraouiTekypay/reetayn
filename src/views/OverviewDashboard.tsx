import React, { useEffect, useState } from 'react';
import {
  ContextView,
  Box,
  Badge,
  Inline,
  Divider,
  PropertyList,
  PropertyListItem,
  Spinner,
  Link,
  Button,
  Banner,
} from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';

interface OverviewMetrics {
  totalTracked: number;
  atRiskMrrFormatted: string;
  tierCounts: {
    CRITICAL: { count: number; mrrCents: number };
    HIGH: { count: number; mrrCents: number };
    MEDIUM: { count: number; mrrCents: number };
    LOW: { count: number; mrrCents: number };
  };
  rescuesDispatched: number;
  rescuesResolved: number;
  recoveryRatePercent: number;
}

export const OverviewDashboard: React.FC<Partial<ExtensionContextValue>> = ({
  userContext,
}) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stripeAccountId = userContext?.account?.id;

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const params = stripeAccountId ? `?stripeAccountId=${stripeAccountId}` : '';
        const res = await fetch(`https://reetayn.com/api/metrics${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMetrics(data);
      } catch (err: unknown) {
        console.error('[OverviewDashboard] Load error:', err);
        setErrorMessage('Unable to load real-time churn metrics.');
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, [stripeAccountId]);

  return (
    <ContextView
      title="Reetayn Churn Defense"
      actions={
        <Link
          href="https://reetayn.com/dashboard"
          target="_blank"
          type="secondary"
        >
          View Full Dashboard
        </Link>
      }
    >
      <Box css={{ stack: 'y', gap: 'large', padding: 'medium' }}>
        {errorMessage && (
          <Banner
            type="caution"
            title="Intelligence Sync Notice"
            description={errorMessage}
          />
        )}

        {loading && (
          <Box css={{ alignX: 'center', padding: 'large' }}>
            <Spinner size="large" />
          </Box>
        )}

        {!loading && metrics && (
          <>
            {/* Top Metric Header */}
            <Box css={{ stack: 'y', gap: 'xsmall' }}>
              <Box css={{ color: 'secondary' }}>MRR At Risk This Cycle</Box>
              <Inline css={{ alignY: 'baseline', gap: 'small' }}>
                <Box css={{ font: 'heading' }}>
                  {metrics.atRiskMrrFormatted}
                </Box>
                {metrics.tierCounts.CRITICAL.count > 0 && (
                  <Badge type="negative">
                    {metrics.tierCounts.CRITICAL.count} Critical
                  </Badge>
                )}
              </Inline>
            </Box>

            <Divider />

            {/* Risk Distribution Breakdown */}
            <PropertyList>
              <PropertyListItem
                label="Critical Risk"
                value={`${metrics.tierCounts.CRITICAL.count} subscribers`}
              />
              <PropertyListItem
                label="High Risk (Expiring Soon)"
                value={`${metrics.tierCounts.HIGH.count} subscribers`}
              />
              <PropertyListItem
                label="Automated Rescues Dispatched"
                value={`${metrics.rescuesDispatched} links sent`}
              />
              <PropertyListItem
                label="Recovery Success Rate"
                value={`${metrics.recoveryRatePercent}%`}
              />
            </PropertyList>

            <Divider />

            {/* Zero-Touch Protection Status */}
            <Box css={{ stack: 'y', gap: 'small' }}>
              <Inline css={{ alignY: 'center', gap: 'small' }}>
                <Badge type="positive">
                  Zero-Touch Engine Active
                </Badge>
              </Inline>
              <Box css={{ color: 'secondary' }}>
                Reetayn is monitoring upcoming billing cycles, expiring credit cards, and soft declines automatically.
              </Box>
            </Box>
          </>
        )}
      </Box>
    </ContextView>
  );
};

export default OverviewDashboard;

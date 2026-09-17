/**
 * Reetayn Churn Risk Scoring Engine
 * Deterministic heuristic for evaluating involuntary subscription churn risk
 * before payment failure occurs.
 */

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ChurnRiskInput {
  cardExpMonth?: number | null;
  cardExpYear?: number | null;
  consecutiveFailures?: number | null;
  lastDeclineCode?: string | null;
  lastDeclineAt?: Date | string | null;
  nextRenewalDate?: Date | string | null;
  /**
   * Reference date for "now" (defaults to current system time).
   * Enables deterministic evaluation during unit testing.
   */
  referenceDate?: Date | string | null;
}

export interface ChurnRiskResult {
  tier: RiskTier;
  score: number; // 0 to 100 risk score
  reason: string;
  badgeLabel: string;
  badgeVariant: 'success' | 'warning' | 'critical' | 'neutral';
  details: {
    cardExpirationDate: Date | null;
    nextRenewalDate: Date | null;
    daysUntilCardExpiryPastRenewal: number | null;
    isCardExpiredBeforeRenewal: boolean;
    hasRecentSoftDecline: boolean;
    consecutiveFailures: number;
    lastDeclineCode: string | null;
  };
}

/**
 * Standard Stripe soft decline codes that indicate temporary payment friction
 */
export const SOFT_DECLINE_CODES = new Set([
  'insufficient_funds',
  'try_again_later',
  'card_velocity_exceeded',
  'processing_error',
  'temporary_lookup_failure',
]);

/**
 * Calculates the exact expiration instant for a credit card.
 * Cards expire at the final millisecond of the expiration month in UTC.
 * Example: 02/2028 expires at 2028-02-29 23:59:59.999 UTC (leap year aware).
 */
export function getCardExpirationDate(month: number, year: number): Date {
  const fullYear = year < 100 ? 2000 + year : year;
  // Date.UTC(year, month, 0) gives the last day of the specified month (month 1-12)
  return new Date(Date.UTC(fullYear, month, 0, 23, 59, 59, 999));
}

/**
 * Evaluates the deterministic churn risk heuristic.
 */
export function calculateChurnRisk(input: ChurnRiskInput): ChurnRiskResult {
  const refDate = input.referenceDate
    ? new Date(input.referenceDate)
    : new Date();
  
  const consecutiveFailures = Math.max(0, input.consecutiveFailures ?? 0);
  const declineCode = input.lastDeclineCode ? input.lastDeclineCode.trim().toLowerCase() : null;
  
  let declineDate: Date | null = null;
  if (input.lastDeclineAt) {
    declineDate = new Date(input.lastDeclineAt);
  }

  // Check for recent soft decline within 7 days
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const hasRecentSoftDecline = Boolean(
    declineCode &&
    SOFT_DECLINE_CODES.has(declineCode) &&
    declineDate &&
    (refDate.getTime() - declineDate.getTime()) <= sevenDaysMs &&
    (refDate.getTime() - declineDate.getTime()) >= 0
  );

  const nextRenewal = input.nextRenewalDate ? new Date(input.nextRenewalDate) : null;
  
  // Card expiration calculation
  let cardExpiry: Date | null = null;
  let daysUntilExpiryPastRenewal: number | null = null;
  let isCardExpiredBeforeRenewal = false;

  if (input.cardExpMonth && input.cardExpYear) {
    cardExpiry = getCardExpirationDate(input.cardExpMonth, input.cardExpYear);

    if (nextRenewal) {
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffMs = cardExpiry.getTime() - nextRenewal.getTime();
      daysUntilExpiryPastRenewal = diffMs / msPerDay;
      if (diffMs < 0) {
        isCardExpiredBeforeRenewal = true;
      }
    }
  }

  // 1. CRITICAL
  // - consecutiveFailures >= 2 OR
  // - Card expiration date is < nextRenewalDate (card expires before next billing attempt)
  if (consecutiveFailures >= 2) {
    return {
      tier: 'CRITICAL',
      score: 95,
      reason: `${consecutiveFailures} consecutive billing failures detected. Immediate rescue intervention required.`,
      badgeLabel: 'Payment At Immediate Risk',
      badgeVariant: 'critical',
      details: {
        cardExpirationDate: cardExpiry,
        nextRenewalDate: nextRenewal,
        daysUntilCardExpiryPastRenewal: daysUntilExpiryPastRenewal,
        isCardExpiredBeforeRenewal,
        hasRecentSoftDecline,
        consecutiveFailures,
        lastDeclineCode: declineCode,
      },
    };
  }

  // If card is already expired relative to current reference date
  if (cardExpiry && cardExpiry.getTime() < refDate.getTime()) {
    return {
      tier: 'CRITICAL',
      score: 92,
      reason: `Card has already expired (${input.cardExpMonth}/${input.cardExpYear}). Next charge will be declined.`,
      badgeLabel: 'Payment At Immediate Risk',
      badgeVariant: 'critical',
      details: {
        cardExpirationDate: cardExpiry,
        nextRenewalDate: nextRenewal,
        daysUntilCardExpiryPastRenewal: daysUntilExpiryPastRenewal,
        isCardExpiredBeforeRenewal: true,
        hasRecentSoftDecline,
        consecutiveFailures,
        lastDeclineCode: declineCode,
      },
    };
  }

  if (isCardExpiredBeforeRenewal) {
    return {
      tier: 'CRITICAL',
      score: 90,
      reason: `Card expires before scheduled renewal date (${input.cardExpMonth}/${input.cardExpYear} vs ${nextRenewal?.toISOString().slice(0, 10)}). Renewal is guaranteed to fail.`,
      badgeLabel: 'Payment At Immediate Risk',
      badgeVariant: 'critical',
      details: {
        cardExpirationDate: cardExpiry,
        nextRenewalDate: nextRenewal,
        daysUntilCardExpiryPastRenewal: daysUntilExpiryPastRenewal,
        isCardExpiredBeforeRenewal,
        hasRecentSoftDecline,
        consecutiveFailures,
        lastDeclineCode: declineCode,
      },
    };
  }

  // 2. HIGH
  // - Card expiration is within 30 days of renewal date OR
  // - Recent soft decline code logged (insufficient_funds, try_again_later) within the last 7 days
  const isExpiringWithin30Days =
    daysUntilExpiryPastRenewal !== null &&
    daysUntilExpiryPastRenewal >= 0 &&
    daysUntilExpiryPastRenewal <= 30;

  if (isExpiringWithin30Days) {
    const roundedDays = Math.max(0, Math.floor(daysUntilExpiryPastRenewal!));
    return {
      tier: 'HIGH',
      score: 75,
      reason: `Payment method expires within ${roundedDays} days of next renewal. High risk of renewal failure.`,
      badgeLabel: 'Expiring Before Next Cycle',
      badgeVariant: 'warning',
      details: {
        cardExpirationDate: cardExpiry,
        nextRenewalDate: nextRenewal,
        daysUntilCardExpiryPastRenewal: daysUntilExpiryPastRenewal,
        isCardExpiredBeforeRenewal,
        hasRecentSoftDecline,
        consecutiveFailures,
        lastDeclineCode: declineCode,
      },
    };
  }

  if (hasRecentSoftDecline) {
    return {
      tier: 'HIGH',
      score: 70,
      reason: `Recent soft decline (${declineCode}) logged within the last 7 days. Escalation recommended.`,
      badgeLabel: 'Recent Soft Decline Logged',
      badgeVariant: 'warning',
      details: {
        cardExpirationDate: cardExpiry,
        nextRenewalDate: nextRenewal,
        daysUntilCardExpiryPastRenewal: daysUntilExpiryPastRenewal,
        isCardExpiredBeforeRenewal,
        hasRecentSoftDecline,
        consecutiveFailures,
        lastDeclineCode: declineCode,
      },
    };
  }

  // 3. MEDIUM
  // - Card expiration is within 60 days of renewal date
  // - Or 1 consecutive failure pending retry
  const isExpiringWithin60Days =
    daysUntilExpiryPastRenewal !== null &&
    daysUntilExpiryPastRenewal > 30 &&
    daysUntilExpiryPastRenewal <= 60;

  if (isExpiringWithin60Days) {
    const roundedDays = Math.floor(daysUntilExpiryPastRenewal!);
    return {
      tier: 'MEDIUM',
      score: 45,
      reason: `Card expires within ${roundedDays} days of renewal. Proactive monitoring active.`,
      badgeLabel: 'Expiring Soon (30-60 Days)',
      badgeVariant: 'warning',
      details: {
        cardExpirationDate: cardExpiry,
        nextRenewalDate: nextRenewal,
        daysUntilCardExpiryPastRenewal: daysUntilExpiryPastRenewal,
        isCardExpiredBeforeRenewal,
        hasRecentSoftDecline,
        consecutiveFailures,
        lastDeclineCode: declineCode,
      },
    };
  }

  if (consecutiveFailures === 1) {
    return {
      tier: 'MEDIUM',
      score: 50,
      reason: '1 recent payment failure recorded. Stripe smart retries active.',
      badgeLabel: 'Single Failure Logged',
      badgeVariant: 'warning',
      details: {
        cardExpirationDate: cardExpiry,
        nextRenewalDate: nextRenewal,
        daysUntilCardExpiryPastRenewal: daysUntilExpiryPastRenewal,
        isCardExpiredBeforeRenewal,
        hasRecentSoftDecline,
        consecutiveFailures,
        lastDeclineCode: declineCode,
      },
    };
  }

  // 4. LOW
  // - Card valid for > 60 days past renewal, zero recent failures
  const daysValid = daysUntilExpiryPastRenewal !== null
    ? Math.floor(daysUntilExpiryPastRenewal)
    : 90;

  return {
    tier: 'LOW',
    score: 10,
    reason: `Payment method healthy. Card valid for ${daysValid} days past next renewal with 0 failures.`,
    badgeLabel: 'Payment Method Healthy',
    badgeVariant: 'success',
    details: {
      cardExpirationDate: cardExpiry,
      nextRenewalDate: nextRenewal,
      daysUntilCardExpiryPastRenewal: daysUntilExpiryPastRenewal,
      isCardExpiredBeforeRenewal,
      hasRecentSoftDecline,
      consecutiveFailures,
      lastDeclineCode: declineCode,
    },
  };
}

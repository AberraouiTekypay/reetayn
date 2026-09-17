import { describe, it, expect } from 'vitest';
import {
  calculateChurnRisk,
  getCardExpirationDate,
  SOFT_DECLINE_CODES,
} from '../src/lib/scoring';

describe('Deterministic Churn Risk Heuristic (src/lib/scoring.ts)', () => {
  describe('Card Expiration Calculation & Edge Cases', () => {
    it('accurately calculates leap year February expiration (2024-02-29)', () => {
      const expDate = getCardExpirationDate(2, 2024);
      expect(expDate.getUTCFullYear()).toBe(2024);
      expect(expDate.getUTCMonth()).toBe(1); // 0-indexed February
      expect(expDate.getUTCDate()).toBe(29);
      expect(expDate.getUTCHours()).toBe(23);
      expect(expDate.getUTCMinutes()).toBe(59);
      expect(expDate.getUTCSeconds()).toBe(59);
    });

    it('accurately calculates non-leap year February expiration (2025-02-28)', () => {
      const expDate = getCardExpirationDate(2, 2025);
      expect(expDate.getUTCFullYear()).toBe(2025);
      expect(expDate.getUTCMonth()).toBe(1);
      expect(expDate.getUTCDate()).toBe(28);
    });

    it('accurately calculates month roll-over for 31-day months (December 31)', () => {
      const expDate = getCardExpirationDate(12, 2026);
      expect(expDate.getUTCFullYear()).toBe(2026);
      expect(expDate.getUTCMonth()).toBe(11); // December
      expect(expDate.getUTCDate()).toBe(31);
    });

    it('accurately calculates month roll-over for 30-day months (April 30)', () => {
      const expDate = getCardExpirationDate(4, 2026);
      expect(expDate.getUTCFullYear()).toBe(2026);
      expect(expDate.getUTCMonth()).toBe(3); // April
      expect(expDate.getUTCDate()).toBe(30);
    });

    it('supports 2-digit years (e.g. 26 -> 2026)', () => {
      const expDate = getCardExpirationDate(5, 26);
      expect(expDate.getUTCFullYear()).toBe(2026);
      expect(expDate.getUTCDate()).toBe(31);
    });
  });

  describe('Tier 1: CRITICAL Risk', () => {
    it('flags CRITICAL when consecutiveFailures >= 2 even if card is valid', () => {
      const result = calculateChurnRisk({
        cardExpMonth: 12,
        cardExpYear: 2030,
        consecutiveFailures: 2,
        nextRenewalDate: new Date('2026-10-01T00:00:00Z'),
        referenceDate: new Date('2026-09-17T00:00:00Z'),
      });

      expect(result.tier).toBe('CRITICAL');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.badgeLabel).toBe('Payment At Immediate Risk');
      expect(result.reason).toContain('2 consecutive billing failures');
    });

    it('flags CRITICAL when card expires BEFORE the next renewal date', () => {
      // Card expires 2026-09-30 23:59:59.999Z, renewal scheduled on 2026-10-05
      const result = calculateChurnRisk({
        cardExpMonth: 9,
        cardExpYear: 2026,
        consecutiveFailures: 0,
        nextRenewalDate: new Date('2026-10-05T00:00:00Z'),
        referenceDate: new Date('2026-09-17T00:00:00Z'),
      });

      expect(result.tier).toBe('CRITICAL');
      expect(result.details.isCardExpiredBeforeRenewal).toBe(true);
      expect(result.badgeLabel).toBe('Payment At Immediate Risk');
      expect(result.reason).toContain('Card expires before scheduled renewal');
    });

    it('flags CRITICAL if card is already expired relative to current reference date', () => {
      const result = calculateChurnRisk({
        cardExpMonth: 8,
        cardExpYear: 2026, // Expired August 31, 2026
        consecutiveFailures: 0,
        nextRenewalDate: new Date('2026-09-20T00:00:00Z'),
        referenceDate: new Date('2026-09-17T00:00:00Z'),
      });

      expect(result.tier).toBe('CRITICAL');
      expect(result.reason).toContain('already expired');
    });
  });

  describe('Tier 2: HIGH Risk', () => {
    it('flags HIGH when card expiration is within 30 days of renewal date', () => {
      // Card expires 2026-10-31, Renewal on 2026-10-15 -> ~16 days buffer (<= 30 days)
      const result = calculateChurnRisk({
        cardExpMonth: 10,
        cardExpYear: 2026,
        consecutiveFailures: 0,
        nextRenewalDate: new Date('2026-10-15T00:00:00Z'),
        referenceDate: new Date('2026-09-17T00:00:00Z'),
      });

      expect(result.tier).toBe('HIGH');
      expect(result.badgeLabel).toBe('Expiring Before Next Cycle');
      expect(result.details.daysUntilCardExpiryPastRenewal).toBeLessThanOrEqual(30);
    });

    it('flags HIGH when soft decline (insufficient_funds) logged within last 7 days', () => {
      const refDate = new Date('2026-09-17T12:00:00Z');
      const declineDate = new Date('2026-09-14T12:00:00Z'); // 3 days ago

      const result = calculateChurnRisk({
        cardExpMonth: 12,
        cardExpYear: 2028, // Card valid for years
        consecutiveFailures: 1,
        lastDeclineCode: 'insufficient_funds',
        lastDeclineAt: declineDate,
        nextRenewalDate: new Date('2026-09-25T00:00:00Z'),
        referenceDate: refDate,
      });

      expect(result.tier).toBe('HIGH');
      expect(result.badgeLabel).toBe('Recent Soft Decline Logged');
      expect(result.details.hasRecentSoftDecline).toBe(true);
    });

    it('flags HIGH when soft decline (try_again_later) logged within last 7 days', () => {
      const refDate = new Date('2026-09-17T12:00:00Z');
      const declineDate = new Date('2026-09-11T12:00:00Z'); // 6 days ago

      const result = calculateChurnRisk({
        cardExpMonth: 12,
        cardExpYear: 2028,
        consecutiveFailures: 1,
        lastDeclineCode: 'try_again_later',
        lastDeclineAt: declineDate,
        nextRenewalDate: new Date('2026-10-01T00:00:00Z'),
        referenceDate: refDate,
      });

      expect(result.tier).toBe('HIGH');
      expect(result.details.hasRecentSoftDecline).toBe(true);
    });

    it('does NOT trigger HIGH for soft decline older than 7 days (falls back to single failure / medium)', () => {
      const refDate = new Date('2026-09-17T12:00:00Z');
      const oldDeclineDate = new Date('2026-09-05T12:00:00Z'); // 12 days ago

      const result = calculateChurnRisk({
        cardExpMonth: 12,
        cardExpYear: 2028,
        consecutiveFailures: 1,
        lastDeclineCode: 'insufficient_funds',
        lastDeclineAt: oldDeclineDate,
        nextRenewalDate: new Date('2026-10-01T00:00:00Z'),
        referenceDate: refDate,
      });

      expect(result.tier).not.toBe('HIGH');
      expect(result.details.hasRecentSoftDecline).toBe(false);
      expect(result.tier).toBe('MEDIUM'); // 1 failure
    });
  });

  describe('Tier 3: MEDIUM Risk', () => {
    it('flags MEDIUM when card expiration is between 31 and 60 days past renewal', () => {
      // Renewal on 2026-09-15. Card expires 2026-10-31 (~46 days buffer)
      const result = calculateChurnRisk({
        cardExpMonth: 10,
        cardExpYear: 2026,
        consecutiveFailures: 0,
        nextRenewalDate: new Date('2026-09-15T00:00:00Z'),
        referenceDate: new Date('2026-09-01T00:00:00Z'),
      });

      expect(result.tier).toBe('MEDIUM');
      expect(result.badgeLabel).toBe('Expiring Soon (30-60 Days)');
      expect(result.details.daysUntilCardExpiryPastRenewal).toBeGreaterThan(30);
      expect(result.details.daysUntilCardExpiryPastRenewal).toBeLessThanOrEqual(60);
    });

    it('flags MEDIUM when 1 consecutive failure has occurred without recent soft decline', () => {
      const result = calculateChurnRisk({
        cardExpMonth: 12,
        cardExpYear: 2028,
        consecutiveFailures: 1,
        nextRenewalDate: new Date('2026-10-01T00:00:00Z'),
        referenceDate: new Date('2026-09-17T00:00:00Z'),
      });

      expect(result.tier).toBe('MEDIUM');
      expect(result.badgeLabel).toBe('Single Failure Logged');
    });
  });

  describe('Tier 4: LOW Risk', () => {
    it('flags LOW when card is valid for > 60 days past renewal with 0 failures', () => {
      // Renewal on 2026-09-15, Card expires 2027-12-31 (> 400 days buffer)
      const result = calculateChurnRisk({
        cardExpMonth: 12,
        cardExpYear: 2027,
        consecutiveFailures: 0,
        nextRenewalDate: new Date('2026-09-15T00:00:00Z'),
        referenceDate: new Date('2026-09-01T00:00:00Z'),
      });

      expect(result.tier).toBe('LOW');
      expect(result.score).toBeLessThanOrEqual(25);
      expect(result.badgeLabel).toBe('Payment Method Healthy');
      expect(result.details.daysUntilCardExpiryPastRenewal).toBeGreaterThan(60);
    });
  });

  describe('Edge cases and defensive parsing', () => {
    it('handles null, undefined and empty inputs safely', () => {
      const result = calculateChurnRisk({});
      expect(result.tier).toBe('LOW');
      expect(result.score).toBeDefined();
    });

    it('correctly handles all defined SOFT_DECLINE_CODES', () => {
      expect(SOFT_DECLINE_CODES.has('insufficient_funds')).toBe(true);
      expect(SOFT_DECLINE_CODES.has('try_again_later')).toBe(true);
      expect(SOFT_DECLINE_CODES.has('card_velocity_exceeded')).toBe(true);
    });
  });
});

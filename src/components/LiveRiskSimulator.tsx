'use client';

import React, { useState, useMemo } from 'react';
import { calculateChurnRisk } from '@/lib/scoring';
import { AlertOctagon, AlertTriangle, CheckCircle2, Copy, ExternalLink, RefreshCw, Zap } from 'lucide-react';

export default function LiveRiskSimulator() {
  const [expMonth, setExpMonth] = useState<number>(9);
  const [expYear, setExpYear] = useState<number>(2026);
  const [consecutiveFailures, setConsecutiveFailures] = useState<number>(0);
  const [declineCode, setDeclineCode] = useState<string>('');
  const [daysSinceDecline, setDaysSinceDecline] = useState<number>(2);
  const [renewalOffsetDays, setRenewalOffsetDays] = useState<number>(14);

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [rescueUrl, setRescueUrl] = useState<string | null>(null);

  // Compute reference dates
  const now = useMemo(() => new Date(), []);
  
  const renewalDate = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + renewalOffsetDays);
    return d;
  }, [now, renewalOffsetDays]);

  const declineAt = useMemo(() => {
    if (!declineCode) return null;
    const d = new Date(now);
    d.setDate(d.getDate() - daysSinceDecline);
    return d;
  }, [now, declineCode, daysSinceDecline]);

  // Run the deterministic scoring heuristic
  const result = useMemo(() => {
    return calculateChurnRisk({
      cardExpMonth: expMonth,
      cardExpYear: expYear,
      consecutiveFailures,
      lastDeclineCode: declineCode || null,
      lastDeclineAt: declineAt,
      nextRenewalDate: renewalDate,
      referenceDate: now,
    });
  }, [expMonth, expYear, consecutiveFailures, declineCode, declineAt, renewalDate, now]);

  const handleGenerateLink = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const mockUrl = `https://billing.stripe.com/p/session/live_portal_${Math.random().toString(36).substring(2, 11)}?update_payment_method=1`;
      setRescueUrl(mockUrl);
      setIsGenerating(false);
      navigator.clipboard?.writeText(mockUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3500);
    }, 400);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          meter: 'bg-rose-500',
          text: 'text-rose-400',
          glow: 'from-rose-500/15',
        };
      case 'HIGH':
        return {
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          meter: 'bg-amber-500',
          text: 'text-amber-400',
          glow: 'from-amber-500/15',
        };
      case 'MEDIUM':
        return {
          badge: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
          meter: 'bg-yellow-400',
          text: 'text-yellow-300',
          glow: 'from-yellow-500/10',
        };
      case 'LOW':
      default:
        return {
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          meter: 'bg-emerald-500',
          text: 'text-emerald-400',
          glow: 'from-emerald-500/15',
        };
    }
  };

  const colors = getTierColor(result.tier);

  return (
    <section id="simulator" className="py-20 bg-slate-900/50 border-y border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Interactive Churn Risk Simulator
          </h2>
          <p className="mt-3 text-slate-300">
            Test the deterministic heuristic in real time. Adjust payment method attributes,
            renewal intervals, and decline codes to inspect scoring response and automated rescue actions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Panel */}
          <div className="lg:col-span-6 bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <span>Subscriber Payment Parameters</span>
            </h3>

            <div className="space-y-6">
              {/* Card Expiration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                    Card Exp Month
                  </label>
                  <select
                    value={expMonth}
                    onChange={(e) => setExpMonth(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')} - {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'short' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                    Card Exp Year
                  </label>
                  <select
                    value={expYear}
                    onChange={(e) => setExpYear(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y}>
                        {y} {y === 2024 || y === 2028 ? '(Leap Year)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Renewal Window */}
              <div>
                <div className="flex justify-between text-xs font-semibold uppercase text-slate-400 mb-2">
                  <span>Upcoming Renewal In</span>
                  <span className="text-emerald-400">{renewalOffsetDays} Days ({renewalDate.toLocaleDateString()})</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="90"
                  value={renewalOffsetDays}
                  onChange={(e) => setRenewalOffsetDays(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Consecutive Failures */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                  Consecutive Billing Failures
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setConsecutiveFailures(count)}
                      className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${
                        consecutiveFailures === count
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {count === 3 ? '3+ (Hard)' : count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soft Decline Code */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                  Recent Decline Code (Optional)
                </label>
                <select
                  value={declineCode}
                  onChange={(e) => setDeclineCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">None (Clean billing status)</option>
                  <option value="insufficient_funds">insufficient_funds (Soft Decline)</option>
                  <option value="try_again_later">try_again_later (Soft Decline)</option>
                  <option value="card_velocity_exceeded">card_velocity_exceeded (Soft Decline)</option>
                  <option value="do_not_honor">do_not_honor (Issuer Block)</option>
                  <option value="lost_or_stolen_card">lost_or_stolen_card (Hard Block)</option>
                </select>
              </div>

              {/* Days since decline (if decline selected) */}
              {declineCode && (
                <div>
                  <div className="flex justify-between text-xs font-semibold uppercase text-slate-400 mb-2">
                    <span>Decline Occurred</span>
                    <span className="text-amber-400">{daysSinceDecline} Days Ago {daysSinceDecline <= 7 ? '(Within 7-Day Window)' : '(Older than 7 days)'}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="14"
                    value={daysSinceDecline}
                    onChange={(e) => setDaysSinceDecline(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              )}

              {/* Quick Presets */}
              <div className="pt-4 border-t border-slate-800">
                <span className="text-xs text-slate-400 block mb-2 font-medium">Quick Test Scenarios:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExpMonth(9);
                      setExpYear(2026);
                      setRenewalOffsetDays(20);
                      setConsecutiveFailures(0);
                      setDeclineCode('');
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    Card Expires Before Renewal (CRITICAL)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExpMonth(10);
                      setExpYear(2026);
                      setRenewalOffsetDays(10);
                      setConsecutiveFailures(0);
                      setDeclineCode('insufficient_funds');
                      setDaysSinceDecline(3);
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    Soft Decline within 7 Days (HIGH)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExpMonth(12);
                      setExpYear(2028);
                      setRenewalOffsetDays(30);
                      setConsecutiveFailures(0);
                      setDeclineCode('');
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    Healthy Payment Method (LOW)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Diagnostics Output */}
          <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            <div className={`absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-bl ${colors.glow} to-transparent blur-3xl pointer-events-none`} />

            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Evaluation Output
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${colors.badge}`}>
                {result.tier} TIER
              </span>
            </div>

            {/* Main Badge */}
            <div className="mb-6">
              <div className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                {result.tier === 'CRITICAL' && <AlertOctagon className="w-6 h-6 text-rose-400" />}
                {result.tier === 'HIGH' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                {result.tier === 'MEDIUM' && <AlertTriangle className="w-6 h-6 text-yellow-400" />}
                {result.tier === 'LOW' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                <span>{result.badgeLabel}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {result.reason}
              </p>
            </div>

            {/* Risk Meter */}
            <div className="mb-6 bg-slate-900/80 p-4 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-slate-400">Calculated Churn Risk Score</span>
                <span className={`text-base font-bold ${colors.text}`}>{result.score} / 100</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${colors.meter}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>

            {/* Detailed Diagnostic Table */}
            <div className="space-y-3 text-xs mb-8">
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Card Expiry Instant (UTC):</span>
                <span className="font-mono text-slate-200">
                  {result.details.cardExpirationDate
                    ? result.details.cardExpirationDate.toISOString().slice(0, 10) + ' 23:59:59Z'
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Next Billing Renewal:</span>
                <span className="font-mono text-slate-200">
                  {result.details.nextRenewalDate
                    ? result.details.nextRenewalDate.toISOString().slice(0, 10)
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Days Buffer Past Renewal:</span>
                <span className={`font-mono font-semibold ${
                  result.details.daysUntilCardExpiryPastRenewal !== null && result.details.daysUntilCardExpiryPastRenewal < 0
                    ? 'text-rose-400'
                    : 'text-slate-200'
                }`}>
                  {result.details.daysUntilCardExpiryPastRenewal !== null
                    ? `${Math.floor(result.details.daysUntilCardExpiryPastRenewal)} Days`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Card Expired Before Renewal:</span>
                <span className={`font-mono ${result.details.isCardExpiredBeforeRenewal ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                  {result.details.isCardExpiredBeforeRenewal ? 'YES (Critical Failure)' : 'NO (Card Outlives Cycle)'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Recent Soft Decline Active:</span>
                <span className={`font-mono ${result.details.hasRecentSoftDecline ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                  {result.details.hasRecentSoftDecline ? 'YES (< 7 days)' : 'NO'}
                </span>
              </div>
            </div>

            {/* Action Simulator */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left w-full sm:w-auto">
                  <span className="text-xs font-semibold text-white block">Automated Rescue Action</span>
                  <span className="text-[11px] text-slate-400">
                    Single-use billing portal update link
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg font-semibold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>Generate Instant Recovery Link</span>
                </button>
              </div>

              {rescueUrl && (
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs font-mono bg-slate-950 px-3 py-2 rounded border border-slate-800 text-emerald-400">
                  <span className="truncate">{rescueUrl}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(rescueUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="text-slate-400 hover:text-white flex-shrink-0"
                    title="Copy URL"
                  >
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
              {copiedLink && (
                <span className="text-[11px] text-emerald-400 mt-1 block">
                  ✓ Copied single-use link to clipboard with zero login requirement.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

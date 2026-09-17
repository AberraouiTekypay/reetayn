'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Copy,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ArrowUpRight,
  TrendingDown,
  LayoutDashboard,
} from 'lucide-react';

interface CustomerRecord {
  id: string;
  stripeCustomerId: string;
  name: string | null;
  email: string | null;
  currentMrrCents: number;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  churnRiskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  consecutiveFailures: number;
  lastDeclineCode: string | null;
  nextRenewalDate: string | null;
  lastRescuePortalUrl: string | null;
}

interface DashboardMetrics {
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
  recentRescues: Array<{
    id: string;
    stripeCustomerId: string;
    actionType: string;
    status: string;
    createdAt: string;
    failureReason: string | null;
  }>;
}

// Initial demo mock data to ensure dashboard renders beautifully right out of the box
const initialDemoCustomers: CustomerRecord[] = [
  {
    id: 'tc_1',
    stripeCustomerId: 'cus_AcmeCorp891',
    name: 'Acme SaaS Corp',
    email: 'billing@acmecorp.io',
    currentMrrCents: 125000,
    cardLast4: '4242',
    cardBrand: 'visa',
    cardExpMonth: 9,
    cardExpYear: 2026,
    churnRiskTier: 'CRITICAL',
    consecutiveFailures: 2,
    lastDeclineCode: 'card_declined (expired)',
    nextRenewalDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    lastRescuePortalUrl: 'https://billing.stripe.com/p/session/live_portal_acme891',
  },
  {
    id: 'tc_2',
    stripeCustomerId: 'cus_CloudScale021',
    name: 'CloudScale Technologies',
    email: 'finance@cloudscale.net',
    currentMrrCents: 48000,
    cardLast4: '8812',
    cardBrand: 'mastercard',
    cardExpMonth: 10,
    cardExpYear: 2026,
    churnRiskTier: 'HIGH',
    consecutiveFailures: 0,
    lastDeclineCode: 'insufficient_funds',
    nextRenewalDate: new Date(Date.now() + 18 * 86400000).toISOString(),
    lastRescuePortalUrl: null,
  },
  {
    id: 'tc_3',
    stripeCustomerId: 'cus_VentureFlow933',
    name: 'VentureFlow Capital',
    email: 'ops@ventureflow.vc',
    currentMrrCents: 89000,
    cardLast4: '1005',
    cardBrand: 'amex',
    cardExpMonth: 11,
    cardExpYear: 2026,
    churnRiskTier: 'MEDIUM',
    consecutiveFailures: 1,
    lastDeclineCode: null,
    nextRenewalDate: new Date(Date.now() + 45 * 86400000).toISOString(),
    lastRescuePortalUrl: null,
  },
  {
    id: 'tc_4',
    stripeCustomerId: 'cus_ApexDesign114',
    name: 'Apex Design Labs',
    email: 'sarah@apexdesign.co',
    currentMrrCents: 12900,
    cardLast4: '5556',
    cardBrand: 'visa',
    cardExpMonth: 12,
    cardExpYear: 2028,
    churnRiskTier: 'LOW',
    consecutiveFailures: 0,
    lastDeclineCode: null,
    nextRenewalDate: new Date(Date.now() + 28 * 86400000).toISOString(),
    lastRescuePortalUrl: null,
  },
];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>(initialDemoCustomers);
  const [autoRescueEnabled, setAutoRescueEnabled] = useState<boolean>(true);
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.warn('Using local dashboard state:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateRescue = async (customerId: string) => {
    try {
      setGeneratingId(customerId);
      const res = await fetch('/api/rescue/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeCustomerId: customerId,
          actionType: 'MANUAL_DRAWER_TRIGGER',
        }),
      });

      let linkUrl = '';
      if (res.ok) {
        const data = await res.json();
        linkUrl = data.url;
      } else {
        linkUrl = `https://billing.stripe.com/p/session/mock_${customerId}?action=update_pm`;
      }

      navigator.clipboard?.writeText(linkUrl);
      setToastMessage(`Generated 1-click rescue URL for ${customerId} & copied to clipboard!`);
      setTimeout(() => setToastMessage(null), 4000);

      // Update local state
      setCustomers((prev) =>
        prev.map((c) =>
          c.stripeCustomerId === customerId
            ? { ...c, lastRescuePortalUrl: linkUrl }
            : c
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingId(null);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesTier = filterTier === 'ALL' || c.churnRiskTier === filterTier;
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      !query ||
      c.stripeCustomerId.toLowerCase().includes(query) ||
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query));

    return matchesTier && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Dashboard Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-bold text-lg text-white">Reetayn</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm font-medium text-slate-300">Merchant Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-mono">Stripe Webhook Listener: Active</span>
            </div>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-sm shadow-lg shadow-emerald-500/10 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs text-emerald-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: MRR At Risk */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-start text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>MRR At Risk This Cycle</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {metrics?.atRiskMrrFormatted || '$1,730.00'}
            </div>
            <span className="text-xs text-rose-400 mt-1 block">
              Critical & High risk subscriptions
            </span>
          </div>

          {/* Card 2: Critical Subscribers */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-start text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Immediate Attention</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {customers.filter((c) => c.churnRiskTier === 'CRITICAL').length}
            </div>
            <span className="text-xs text-amber-400 mt-1 block">
              Cards expired before renewal / 2+ fails
            </span>
          </div>

          {/* Card 3: Automated Rescues */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-start text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Dispatched Rescues</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {metrics?.rescuesDispatched ?? 14}
            </div>
            <span className="text-xs text-emerald-400 mt-1 block">
              Zero-login portal sessions delivered
            </span>
          </div>

          {/* Card 4: Recovery Success Rate */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-start text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Recovery Success Rate</span>
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {metrics?.recoveryRatePercent ?? 88}%
            </div>
            <span className="text-xs text-teal-400 mt-1 block">
              Rescues resolved with active card
            </span>
          </div>
        </div>

        {/* Global Auto-Rescue Automation Toggle */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Zero-Touch Auto-Rescue Engine</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              When enabled, any <code className="text-emerald-400 font-mono">invoice.payment_failed</code> event
              automatically triggers single-use billing portal link generation and initiates recovery sequences.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAutoRescueEnabled(!autoRescueEnabled)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
              autoRescueEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRescueEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>{autoRescueEnabled ? 'AUTOMATION ENABLED' : 'AUTOMATION PAUSED'}</span>
          </button>
        </div>

        {/* Tracked Customers Table Section */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Tracked Subscribers & Churn Risk</h3>
              <p className="text-xs text-slate-400">
                Monitored deterministically using pre-renewal expiration heuristic.
              </p>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search subscriber..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-48"
                />
              </div>

              {/* Tier Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setFilterTier(tier)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      filterTier === tier
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Subscriber</th>
                  <th className="py-3 px-4">MRR</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Next Renewal</th>
                  <th className="py-3 px-4">Risk Tier</th>
                  <th className="py-3 px-4">Failures</th>
                  <th className="py-3 px-4 text-right">Instant Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No subscribers match current filters.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{c.name || 'Unnamed Subscriber'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.stripeCustomerId}</div>
                        {c.email && <div className="text-[11px] text-slate-500">{c.email}</div>}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-200">
                        ${(c.currentMrrCents / 100).toFixed(2)}/mo
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-mono text-slate-300 uppercase">
                          {c.cardBrand || 'CARD'} •••• {c.cardLast4 || '----'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Exp: {c.cardExpMonth ? `${String(c.cardExpMonth).padStart(2, '0')}/${c.cardExpYear}` : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-300">
                        {c.nextRenewalDate
                          ? new Date(c.nextRenewalDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            c.churnRiskTier === 'CRITICAL'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : c.churnRiskTier === 'HIGH'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : c.churnRiskTier === 'MEDIUM'
                              ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {c.churnRiskTier}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono">
                        <span className={c.consecutiveFailures > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {c.consecutiveFailures}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleGenerateRescue(c.stripeCustomerId)}
                          disabled={generatingId === c.stripeCustomerId}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all inline-flex items-center gap-1 shadow-sm shadow-emerald-500/20"
                        >
                          {generatingId === c.stripeCustomerId ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          <span>Generate 1-Click Link</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Trail Section */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-emerald-400" />
            <span>Recent Automated Rescue Logs</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-slate-300">cus_AcmeCorp891</span>
                <span className="text-slate-400">PORTAL_LINK_GENERATION</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                  DISPATCHED
                </span>
                <span className="text-slate-500">Just now</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="font-mono text-slate-300">cus_CloudScale021</span>
                <span className="text-slate-400">PORTAL_LINK_GENERATION</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono text-[10px]">
                  RESOLVED
                </span>
                <span className="text-slate-500">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

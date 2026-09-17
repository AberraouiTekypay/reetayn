'use client';

import React, { useState } from 'react';
import { ShieldCheck, Copy, CheckCircle2, ExternalLink, Zap, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DrawerPreview() {
  const [activeTab, setActiveTab] = useState<'critical' | 'high' | 'healthy'>('critical');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const scenarios = {
    critical: {
      name: 'Acme SaaS Corp',
      email: 'finance@acmecorp.io',
      customerId: 'cus_N83a7f92kc81',
      mrr: '$1,250.00 / mo',
      badge: 'Payment At Immediate Risk',
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      reason: 'Card expires 09/2026 before next scheduled renewal (2026-10-04). Renewal is guaranteed to fail.',
      score: '92 / 100',
      pm: 'VISA •••• 4242 (Exp: 09/2026)',
      renewal: 'Oct 4, 2026',
      failures: '2',
      declineReason: 'card_declined (expired)',
    },
    high: {
      name: 'CloudScale Technologies',
      email: 'billing@cloudscale.net',
      customerId: 'cus_P92x18m94lc1',
      mrr: '$480.00 / mo',
      badge: 'Expiring Before Next Cycle',
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      reason: 'Payment method expires within 18 days of next renewal cycle.',
      score: '75 / 100',
      pm: 'MASTERCARD •••• 8812 (Exp: 10/2026)',
      renewal: 'Oct 12, 2026',
      failures: '0',
      declineReason: 'None',
    },
    healthy: {
      name: 'Apex Design Labs',
      email: 'sarah@apexdesign.co',
      customerId: 'cus_Q01z49v61la5',
      mrr: '$129.00 / mo',
      badge: 'Payment Method Healthy',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      reason: 'Payment method healthy. Card valid for 420 days past next renewal with 0 failures.',
      score: '10 / 100',
      pm: 'AMEX •••• 1005 (Exp: 12/2028)',
      renewal: 'Oct 1, 2026',
      failures: '0',
      declineReason: 'None',
    },
  };

  const current = scenarios[activeTab];

  const handleCopy = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }, 300);
  };

  return (
    <section id="extension" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-4">
            <span>Stripe Apps UI Extension SDK v9</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Native Stripe Dashboard Drawer
          </h2>
          <p className="mt-3 text-slate-300">
            Rendered natively inside <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded text-sm">stripe.dashboard.customer.detail</code>.
            Support reps and billing operators never leave Stripe to view health diagnostics or generate 1-click update links.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('critical')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Critical Risk Case
            </button>
            <button
              onClick={() => setActiveTab('high')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'high'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Expiring Soon Case
            </button>
            <button
              onClick={() => setActiveTab('healthy')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'healthy'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Healthy Subscriber
            </button>
          </div>
        </div>

        {/* Mock Stripe Dashboard Container */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
          {/* Mock Stripe Top Bar */}
          <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="ml-2 font-mono text-slate-300">dashboard.stripe.com/test/customers/{current.customerId}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-semibold text-slate-300">TEST MODE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Mock Customer Info Left */}
            <div className="md:col-span-7 p-6 border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-950">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{current.name}</h3>
                  <span className="text-xs text-slate-400">{current.email}</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">{current.mrr}</span>
              </div>

              <div className="space-y-4 text-xs text-slate-400">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="font-semibold text-slate-300 mb-1">Active Subscription</div>
                  <div className="flex justify-between text-[11px]">
                    <span>Pro Plan (Monthly)</span>
                    <span>Renews: {current.renewal}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="font-semibold text-slate-300 mb-1">Payment Method on File</div>
                  <div className="text-[11px] font-mono text-slate-300">{current.pm}</div>
                </div>
              </div>
            </div>

            {/* Reetayn Native Drawer Right */}
            <div className="md:col-span-5 p-6 bg-slate-900/40">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Reetayn Intelligence
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE DRAWER</span>
              </div>

              {/* Drawer Content */}
              <div className="space-y-4">
                {/* Risk Badge */}
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${current.badgeClass}`}>
                    {current.badge}
                  </span>
                  <p className="mt-2 text-[11px] text-slate-300 leading-normal">
                    {current.reason}
                  </p>
                </div>

                {/* Property List */}
                <div className="py-2 border-y border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Risk Score:</span>
                    <span className="font-semibold text-white">{current.score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Consecutive Failures:</span>
                    <span className="font-semibold text-white">{current.failures}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Decline Status:</span>
                    <span className="font-mono text-slate-300">{current.declineReason}</span>
                  </div>
                </div>

                {/* Instant Recovery Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg font-bold text-xs text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : copied ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copied ? 'Copied Recovery Link!' : 'Generate Instant Recovery Link'}
                    </span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5">
                    1-click customer portal session with payment method update flow
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

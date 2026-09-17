'use client';

import React from 'react';
import { Shield, Zap, RefreshCw, KeyRound, Database, Cpu, Layers } from 'lucide-react';

export default function Features() {
  const pillars = [
    {
      icon: Cpu,
      title: 'Deterministic Churn Heuristic',
      description:
        'Calculates leap-year-safe card expiration instants vs subscription current_period_end dates, escalating risk to CRITICAL and HIGH before Stripe even fires the first invoice charge.',
    },
    {
      icon: Zap,
      title: '1-Click Zero-Login Portal Rescues',
      description:
        'Generates single-use Stripe Customer Portal sessions pre-configured with payment_method_update flows. Subscribers update their card in 15 seconds without password hurdles.',
    },
    {
      icon: Layers,
      title: 'Native Stripe Dashboard Drawer',
      description:
        'Engineered with Stripe Apps UI Extension SDK v9 primitives. Renders directly in customer detail side panels with real-time risk badges, diagnostic breakdowns, and instant link actions.',
    },
    {
      icon: KeyRound,
      title: 'Signature & Secret Rotation Defense',
      description:
        'Constructs Stripe webhook events with exact raw body handling and multi-secret fallback verification to guarantee zero downtime during API key or webhook secret rotations.',
    },
    {
      icon: Database,
      title: 'PostgreSQL & Indexed Prisma Layer',
      description:
        'High-performance schema utilizing composite indexes (merchantId + stripeCustomerId) for sub-millisecond retrieval and rapid webhook ingestion well under the 250ms Stripe threshold.',
    },
    {
      icon: RefreshCw,
      title: 'Soft Decline & Smart Recovery Loops',
      description:
        'Distinguishes temporary soft declines (insufficient_funds, try_again_later) from hard cancellations, coordinating with Stripe smart retries to prevent premature account termination.',
    },
  ];

  return (
    <section id="architecture" className="py-20 bg-slate-950 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Architecture & Security Foundation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Built for Enterprise Stripe Workflows
          </h2>
          <p className="mt-3 text-slate-300">
            A battle-tested tech stack combining Next.js App Router, Prisma ORM, and the official
            Stripe Apps UI Extension SDK.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div
                key={i}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 transition-all group hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:bg-emerald-500/20 transition-all">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{pillar.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

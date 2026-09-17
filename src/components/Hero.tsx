'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Zap, AlertTriangle, ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-20 pb-24 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-6 backdrop-blur-md">
            <Zap className="w-3.5 h-3.5" />
            <span>Deterministic Pre-Renewal Churn Defense</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Eliminate Involuntary Churn{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Before Renewals Fail
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            A zero-touch, high-margin Stripe App that detects card expirations, soft declines,
            and billing friction <i>weeks before</i> payment attempts—automatically dispatching
            1-click frictionless rescue portals.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#simulator"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 text-base"
            >
              <span>Test Risk Heuristic Live</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-slate-200 hover:text-white bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 transition-all flex items-center justify-center gap-2 text-base"
            >
              <span>Open Merchant Dashboard</span>
            </Link>
          </div>

          {/* Highlights checklist */}
          <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Native Stripe Drawer Extension</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>1-Click Zero-Login Portal Rescues</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Secret Rotation & Raw Webhook Defense</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react';

export default function RoiCalculator() {
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(75000);
  const [involuntaryChurnRate, setInvoluntaryChurnRate] = useState<number>(3.5);
  const [recoveryRate, setRecoveryRate] = useState<number>(72);

  const stats = useMemo(() => {
    // Monthly at-risk revenue from involuntary churn
    const monthlyAtRisk = monthlyRevenue * (involuntaryChurnRate / 100);
    // Recovered monthly revenue via Reetayn
    const monthlyRecovered = monthlyAtRisk * (recoveryRate / 100);
    // Annualized ARR protected
    const annualRecovered = monthlyRecovered * 12;

    return {
      monthlyAtRisk: Math.round(monthlyAtRisk),
      monthlyRecovered: Math.round(monthlyRecovered),
      annualRecovered: Math.round(annualRecovered),
    };
  }, [monthlyRevenue, involuntaryChurnRate, recoveryRate]);

  return (
    <section id="roi" className="py-20 bg-slate-900/30 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Revenue Recovery Calculator
          </h2>
          <p className="mt-3 text-slate-300">
            Over 40% of all SaaS churn is completely involuntary due to expired cards, temporary limit friction,
            or billing date mismatches. See what Reetayn preserves for your subscription base.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* Sliders */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-slate-300">Monthly Recurring Revenue (MRR)</span>
                <span className="text-emerald-400 font-mono text-base font-bold">
                  ${monthlyRevenue.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="500000"
                step="5000"
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>$5k</span>
                <span>$250k</span>
                <span>$500k+</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-slate-300">Estimated Involuntary Churn Rate</span>
                <span className="text-amber-400 font-mono text-base font-bold">
                  {involuntaryChurnRate}% / mo
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={involuntaryChurnRate}
                onChange={(e) => setInvoluntaryChurnRate(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>1% (Low)</span>
                <span>3.5% (Industry Avg)</span>
                <span>8% (High Friction)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-slate-300">Reetayn Recovery Rate</span>
                <span className="text-teal-400 font-mono text-base font-bold">
                  {recoveryRate}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="1"
                value={recoveryRate}
                onChange={(e) => setRecoveryRate(Number(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>50%</span>
                <span>72% (Median)</span>
                <span>90% (Zero-Touch)</span>
              </div>
            </div>
          </div>

          {/* Results Badge Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-2xl rounded-full" />

            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4">
              <TrendingUp className="w-8 h-8" />
            </div>

            <span className="text-xs uppercase tracking-widest text-slate-400 block font-semibold">
              Projected Protected ARR
            </span>
            <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight my-2 font-mono">
              ${stats.annualRecovered.toLocaleString()}
            </div>
            <span className="text-xs text-emerald-400 font-medium block mb-6">
              +${stats.monthlyRecovered.toLocaleString()} preserved every single month
            </span>

            <div className="pt-6 border-t border-slate-800 space-y-3 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Monthly Gross At Risk:</span>
                <span className="text-rose-400 font-mono font-semibold">${stats.monthlyAtRisk.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recovered Monthly:</span>
                <span className="text-emerald-400 font-mono font-semibold">${stats.monthlyRecovered.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time-to-Value:</span>
                <span className="text-slate-200 font-semibold">Instant (No-code Stripe App)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

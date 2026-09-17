'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, LayoutDashboard, Sparkles } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all">
            <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1">
            Reetayn<span className="text-emerald-400">.com</span>
          </span>
          <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Stripe App MVP
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#simulator" className="hover:text-emerald-400 transition-colors">
            Risk Simulator
          </a>
          <a href="#extension" className="hover:text-emerald-400 transition-colors">
            Stripe Drawer
          </a>
          <a href="#roi" className="hover:text-emerald-400 transition-colors">
            ROI Calculator
          </a>
          <a href="#architecture" className="hover:text-emerald-400 transition-colors">
            Tech Stack
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white bg-slate-900 border border-slate-700/60 hover:border-slate-600 transition-all"
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Merchant</span> Dashboard
          </Link>
          <a
            href="https://marketplace.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-md shadow-emerald-500/20"
          >
            <span>Install App</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

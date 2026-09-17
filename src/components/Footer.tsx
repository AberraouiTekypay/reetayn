import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-bold text-sm text-white">Reetayn.com</span>
          <span className="text-slate-500">| Zero-Touch Subscription Retention Utility</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#simulator" className="hover:text-emerald-400 transition-colors">
            Risk Engine
          </a>
          <a href="#extension" className="hover:text-emerald-400 transition-colors">
            Stripe App Extension
          </a>
          <a href="#roi" className="hover:text-emerald-400 transition-colors">
            ROI Calculator
          </a>
          <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
            Merchant Portal
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 text-slate-400">
          <span>© {new Date().getFullYear()} Reetayn.</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span>
            An{' '}
            <a
              href="https://em300.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 transition-colors"
            >
              EM300.co
            </a>{' '}
            Company
          </span>
        </div>
      </div>
    </footer>
  );
}

import React from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import LiveRiskSimulator from '@/components/LiveRiskSimulator';
import DrawerPreview from '@/components/DrawerPreview';
import RoiCalculator from '@/components/RoiCalculator';
import Features from '@/components/Features';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <LiveRiskSimulator />
        <DrawerPreview />
        <RoiCalculator />
        <Features />
      </main>
      <Footer />
    </div>
  );
}

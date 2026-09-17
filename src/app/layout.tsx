import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reetayn — Eliminate Involuntary Churn Before Renewals Fail',
  description:
    'Zero-touch, high-margin B2B subscription utility and Stripe App designed to eliminate involuntary churn and payment failures before renewals fail.',
  keywords: [
    'Stripe App',
    'churn prevention',
    'involuntary churn',
    'payment failure recovery',
    'dunning management',
    'failed payments',
    'subscription retention',
  ],
  authors: [{ name: 'Reetayn Team', url: 'https://reetayn.com' }],
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

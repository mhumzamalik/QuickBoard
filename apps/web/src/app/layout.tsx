import React from 'react';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { Navbar } from '@/components/layout/Navbar';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QuickBoard — Real-time Task & Notes Board',
  description: 'Modern, real-time task and sketch notes board shared across web, desktop, mobile, and browser extensions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <ToastProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}

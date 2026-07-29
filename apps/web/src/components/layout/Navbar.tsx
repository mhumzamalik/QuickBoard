'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '../ui/Button';
import { Download, LayoutGrid, LogOut, Moon, Sun, User as UserIcon } from 'lucide-react';
import { DOWNLOAD_LINKS } from '@/lib/downloadLinks';
import { useToast } from '../ui/Toast';

export const Navbar: React.FC = () => {
  const router = RouterHook();
  const { showToast } = useToast();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  function RouterHook() {
    return useRouter();
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setIsDownloadOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      showToast('Signed out successfully', 'info');
      router.push('/login');
    } catch (err: any) {
      showToast(err.message || 'Error signing out', 'error');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
            Quick<span className="text-blue-600">Board</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div ref={downloadRef} className="relative">
            <button
              onClick={() => setIsDownloadOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Download apps"
              aria-expanded={isDownloadOpen}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {isDownloadOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Get the app
                  </p>
                </div>
                <a
                  href={DOWNLOAD_LINKS.mobileApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsDownloadOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-base">📱</span>
                  <span>Mobile App</span>
                </a>
                <a
                  href={DOWNLOAD_LINKS.desktopApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsDownloadOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-base">💻</span>
                  <span>Desktop App</span>
                </a>
                <a
                  href={DOWNLOAD_LINKS.chromeExtension}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsDownloadOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-base">🧩</span>
                  <span>Chrome Extension</span>
                </a>
              </div>
            )}
          </div>

          {userEmail ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <UserIcon className="w-4 h-4 text-blue-500" />
                <span>{userEmail}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out">
                <LogOut className="w-4 h-4 text-rose-500" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

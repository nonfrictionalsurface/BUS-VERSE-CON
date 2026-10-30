'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { BusVerseLogo } from '@/components/brand/BusVerseLogo';
import { ThemeToggle } from '@/lib/theme/ThemeToggle';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { User, Ticket, LogIn } from 'lucide-react';

interface AppHeaderProps {
  backHref?: string;
  backLabel?: string;
}

export function AppHeader({ backHref, backLabel }: AppHeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur-md border-b border-border-hairline shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <BusVerseLogo size={32} variant="mark" />
            <span className="font-extrabold text-base tracking-tight text-ink-bright hidden sm:inline">
              BusVerse
            </span>
          </Link>

          {backHref && (
            <Link
              href={backHref}
              className="text-xs font-semibold text-ink-secondary hover:text-brand-primary transition-colors border-l border-border-hairline pl-3"
            >
              {backLabel || '← Back'}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-subtle border border-brand-border text-brand-primary hover:bg-brand-primary hover:text-white transition-all text-xs font-mono font-bold cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span className="max-w-[120px] truncate">{user?.name || user?.phone || 'Profile'}</span>
              <Ticket className="w-3 h-3 opacity-70 ml-0.5" />
            </Link>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-primary text-white hover:bg-brand-hover text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
}
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { BusVerseLogo } from '@/components/brand/BusVerseLogo';
import { Sun, Moon, User as UserIcon, LogOut, Ticket } from 'lucide-react';

interface AppHeaderProps {
  onOpenAuth?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenAuth }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BusVerseLogo size={32} variant="icon" />
          <span className="font-sans text-lg font-extrabold tracking-tight text-ink-bright">
            BUS<span className="text-brand-primary">VERSE</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-card text-ink-secondary hover:text-ink-bright transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-ink-primary hover:border-brand-primary transition-all"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span>{user?.name || user?.phone || 'Passenger'}</span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-border-strong bg-surface-card p-1 shadow-floating z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setMenuOpen(false)}
                >
                  <Link
                    href="/bookings"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink-primary hover:bg-surface-hover"
                  >
                    <Ticket className="h-4 w-4 text-brand-primary" />
                    <span>My Trips</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink-primary hover:bg-surface-hover"
                  >
                    <UserIcon className="h-4 w-4 text-brand-primary" />
                    <span>Profile</span>
                  </Link>
                  <div className="my-1 border-t border-border-subtle" />
                  <button
                    onClick={() => logout()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-danger-crimson hover:bg-danger-crimson/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="rounded-lg bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-hover transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

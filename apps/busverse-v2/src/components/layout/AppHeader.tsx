'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';

export function AppHeader() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-border-hairline bg-surface">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-extrabold text-text-bright tracking-tight">
          BusVerse
        </Link>
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-8 h-8" />
          ) : user ? (
            <>
              <Link
                href="/bookings"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                My trips
              </Link>
              <button
                onClick={logout}
                className="text-sm font-medium text-text-muted hover:text-danger-crimson transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
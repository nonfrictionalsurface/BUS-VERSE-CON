'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Sidebar } from './Sidebar';
import { Bell, ShieldAlert, Bus, Menu } from 'lucide-react';
import { TransitLoader } from '@/lib/brand';

function humanize(s: string) {
  return s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  useEffect(() => { setNavOpen(false); }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-bg">
        <TransitLoader size="lg" caption="SYNCHRONIZING" />
      </div>
    );
  }
  if (!user) return null;

  const segments = pathname.split('/').filter(Boolean);
  const currentTitle = segments.length > 0 ? humanize(segments[segments.length - 1]) : 'Dashboard';
  const userInitial = (user.name || user.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex bg-canvas-bg overflow-x-hidden">
      {/* Desktop sidebar (>= lg) */}
      <div className="hidden lg:block lg:w-[260px] lg:shrink-0 lg:h-screen lg:sticky lg:top-0">
        <Sidebar />
      </div>

      {/* Mobile drawer (< lg) */}
      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in"
            onClick={() => setNavOpen(false)}
          />
          <div className="relative h-full w-[280px] max-w-[85vw] animate-in slide-in-from-left duration-200">
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-16 lg:h-20 flex items-center justify-between gap-3 px-3 sm:px-4 md:px-6 lg:px-10 border-b border-line-hairline bg-canvas-subtle sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-md text-ink-primary hover:bg-surface-hover shrink-0"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <span className="sm:hidden text-sm font-bold text-ink-bright truncate">
              {currentTitle}
            </span>

            <nav className="hidden sm:flex text-sm font-medium text-ink-secondary items-center gap-2 min-w-0 overflow-hidden">
              {segments.map((s, i) => (
                <span key={i} className="flex items-center gap-2 min-w-0">
                  {i > 0 && <span className="text-ink-muted">/</span>}
                  <span
                    className={`truncate max-w-[8rem] md:max-w-none ${
                      i === segments.length - 1 ? 'text-ink-bright font-semibold' : ''
                    }`}
                  >
                    {humanize(s)}
                  </span>
                </span>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                isAdmin
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300'
                  : 'bg-brand/15 border-brand/30 text-brand-text'
              }`}
            >
              {isAdmin ? <ShieldAlert size={12} /> : <Bus size={12} />}
              <span className="hidden md:inline">
                {isAdmin ? 'Admin Mode' : 'Operator Mode'}
              </span>
            </div>

            <button
              type="button"
              aria-label="Notifications"
              className="p-2 rounded-full hover:bg-surface-hover text-ink-secondary hover:text-ink-bright transition-colors relative"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-canvas-subtle" />
            </button>

            <div
              title={user.name || user.email || 'User'}
              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center font-bold text-sm border select-none ${
                isAdmin
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300'
                  : 'bg-brand/15 border-brand/30 text-brand-text'
              }`}
            >
              {userInitial}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-10 max-w-[1440px] w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
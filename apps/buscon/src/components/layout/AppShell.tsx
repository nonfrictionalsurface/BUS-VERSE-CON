'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Sidebar } from './Sidebar';
import { Bell, ShieldAlert, Bus } from 'lucide-react';
import { TransitLoader } from '@/lib/brand';

function humanize(s: string) {
  return s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-bg">
        <TransitLoader size="lg" caption="SYNCHRONIZING" />
      </div>
    );
  }
  if (!user) return null;

  const segments = pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen flex bg-canvas-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 flex items-center justify-between px-10 border-b border-line-hairline bg-canvas-subtle">
          <div className="flex items-center gap-4">
            <nav className="text-sm font-medium text-ink-secondary flex items-center gap-2">
              {segments.map((s, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-ink-muted">/</span>}
                  <span className={i === segments.length - 1 ? 'text-ink-bright' : ''}>
                    {humanize(s)}
                  </span>
                </span>
              ))}
            </nav>
            
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
              isAdmin ? 'bg-amber-500/10 text-amber-600' : 'bg-signal-emerald/10 text-brand-text'
            }`}>
              {isAdmin ? <ShieldAlert size={12} /> : <Bus size={12} />}
              {isAdmin ? 'Admin Mode' : 'Operator Mode'}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-surface-hover text-ink-secondary transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-canvas-subtle"></span>
            </button>
            <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm border cursor-pointer ${
              isAdmin ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-signal-emerald/10 border-signal-emerald/30 text-brand-text'
            }`}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </header>
        <main className="flex-1 p-10 max-w-[1440px] w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
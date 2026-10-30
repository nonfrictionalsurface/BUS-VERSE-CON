'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Bus, Route as RouteIcon, Calendar, Users,
  BookOpen, TrendingUp, CheckCircle, RotateCcw, FileText, LogOut,
  ArrowLeftRight, Sun, Moon, ShieldAlert, Building2
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { BusConLogo } from '@/components/brand/BusConLogo';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { CONFIG } from '@/lib/config';
import { cn } from '@/lib/utils/cn';

const operatorNav = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Bus, label: 'Fleet', href: '/operator/buses' },
  { icon: RouteIcon, label: 'Routes', href: '/operator/routes' },
  { icon: Calendar, label: 'Schedules', href: '/operator/schedules' },
  { icon: Users, label: 'Drivers', href: '/operator/drivers' },
  { icon: BookOpen, label: 'Bookings', href: '/operator/bookings' },
  { icon: TrendingUp, label: 'Revenue', href: '/operator/revenue' },
];

const adminNav = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: CheckCircle, label: 'Approvals', href: '/admin/approvals' },
  { icon: Building2, label: 'Operators', href: '/admin/operators' },
  { icon: BookOpen, label: 'Bookings', href: '/admin/bookings' },
  { icon: RotateCcw, label: 'Refunds', href: '/admin/refunds' },
  { icon: FileText, label: 'Audit', href: '/admin/audit' },
];

export function Sidebar() {
  const { user, isAdmin, logout, switchDemoRole } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const items = isAdmin ? adminNav : operatorNav;

  const handleSignOut = async () => {
    await logout();
    router.push('/login');
  };

  const handleSwitch = async () => {
    try {
      await switchDemoRole();
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('Switch failed', err);
    }
  };

  return (
    <aside className="w-[260px] shrink-0 flex flex-col min-h-screen sticky top-0 max-h-screen bg-[var(--sidebar-bg)] border-r border-[#17301F]">
      <div className="h-20 flex items-center px-6 border-b border-[#17301F]">
        <BusConLogo size={32} textColor="var(--sidebar-text)" />
      </div>
      
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-muted)] px-3 mb-2 flex items-center gap-2">
          {isAdmin ? (
            <>
              <ShieldAlert size={12} className="text-amber-500" /> Platform Admin
            </>
          ) : (
            'Operator Console'
          )}
        </div>
        
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text)] shadow-sm'
                  : 'text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
              )}
            >
              <Icon size={18} className={active ? (isAdmin ? 'text-amber-500' : 'text-[var(--brand)]') : ''} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-[#17301F]">
        {CONFIG.DEMO_MODE && (
          <button
            onClick={handleSwitch}
            className="flex items-center gap-3 w-full px-3 py-2.5 mb-2 rounded-lg text-sm font-medium text-[var(--brand)] hover:bg-[var(--sidebar-hover)] transition-colors"
          >
            <ArrowLeftRight size={16} />
            Switch to {isAdmin ? 'operator' : 'admin'}
          </button>
        )}
        
        <div className="flex items-center justify-between px-3 py-2 mb-2">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--sidebar-text)] truncate max-w-[130px]">
              {user?.name || 'User'}
            </span>
            <span className="text-[10px] text-[var(--sidebar-muted)] truncate max-w-[130px]">
              {user?.email}
            </span>
          </div>
          <button
            onClick={toggle}
            className="p-2 rounded-md text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--sidebar-muted)] hover:bg-[#2A1B1F] hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
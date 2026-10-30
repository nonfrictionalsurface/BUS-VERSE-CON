'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-[104px] h-[30px] rounded-full border border-border-strong bg-surface-card opacity-60" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle visual theme"
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border border-border-strong bg-surface-card hover:bg-surface-hover text-ink-primary transition-all duration-200 shadow-ambient"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-3.5 h-3.5 text-warning-amber" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-brand-primary" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}
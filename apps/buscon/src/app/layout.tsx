import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AppProviders } from '@/providers/AppProviders';

export const metadata: Metadata = {
  title: 'BusCon — Operator Console',
  description: 'Fleet, schedules, and oversight for bus operators.',
};

const themeInit = `
  (function(){try{var t=localStorage.getItem('buscon_theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
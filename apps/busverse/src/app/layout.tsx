import type { Metadata } from 'next';
import '../styles/globals.css';
import { AppProviders } from '@/providers/AppProviders';
import { DemoDisclaimer } from '@/components/ui/DemoDisclaimer';

export const metadata: Metadata = {
  title: 'BusVerse — Intercity Mobility Platform',
  description: 'Book intercity bus tickets across India with real-time seat availability.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <DemoDisclaimer />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
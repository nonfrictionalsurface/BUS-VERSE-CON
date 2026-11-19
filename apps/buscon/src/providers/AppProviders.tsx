'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { BackendWakeGate } from '@/components/layout/WakingServerScreen';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          retry: (count, err: any) => (err?.status === 401 || err?.status === 403 || err?.status === 404) ? false : count < 2,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BackendWakeGate>
          <AuthProvider>{children}</AuthProvider>
        </BackendWakeGate>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
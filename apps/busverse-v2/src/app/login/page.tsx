'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { AuthFlow } from '@/features/auth/AuthFlow';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const raw = params.get('returnTo') ?? '/';
  const returnTo = raw.startsWith('/') ? raw : '/';

  useEffect(() => {
    if (!loading && user) {
      router.replace(returnTo);
    }
  }, [user, loading, returnTo, router]);

  return (
    <main className="min-h-screen flex flex-col p-6">
      <header className="max-w-md w-full mx-auto mb-8">
        <Link
          href="/"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to home
        </Link>
      </header>
      <div className="max-w-md w-full mx-auto flex-1">
        <h1 className="text-3xl font-extrabold text-text-bright tracking-tight mb-2">
          Sign in
        </h1>
        <p className="text-text-secondary mb-6">
          Enter your phone number to continue
        </p>
        <AuthFlow />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-text-muted">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
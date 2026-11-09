'use client';

import { AppHeader } from '@/components/layout/AppHeader';
import { SearchForm } from '@/components/search/SearchForm';
import { PopularBuses } from '@/components/search/PopularBuses';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <AppHeader />
      <main className="flex-1">
        <div className="max-w-md w-full mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-text-bright tracking-tight mb-2">
              Book bus tickets
            </h1>
            <p className="text-text-secondary">
              Search verified operators across India
            </p>
          </div>

          <SearchForm />

          <div className="mt-10">
            <h2 className="text-lg font-bold text-text-bright mb-4">
              Available buses today
            </h2>
            <PopularBuses />
          </div>
        </div>
      </main>
    </div>
  );
}
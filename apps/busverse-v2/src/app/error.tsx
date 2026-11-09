'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Something went wrong</h1>
      <p className="text-text-secondary mb-6">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-brand text-white rounded-lg">Try again</button>
    </main>
  );
}

'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-bg p-6">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-danger-crimson">500</h1>
        <p className="mt-4 text-ink-primary">Something went wrong.</p>
        <button onClick={reset} className="mt-6 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover">
          Try again
        </button>
      </div>
    </div>
  );
}
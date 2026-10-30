import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped context. Every log line, audit row, and BullMQ job should
 * carry this so requests can be traced end-to-end.
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

export function setContext(patch: Partial<RequestContext>): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  Object.assign(ctx, patch);
}
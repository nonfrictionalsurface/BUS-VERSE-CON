import { CONFIG } from '../config';
import type { ApiEnvelope } from '../../types';
import { userMessageFor } from './errors';

let accessToken: string | null = null;

export function setAccessToken(t: string | null): void {
  accessToken = t;
}
export function getAccessToken(): string | null {
  return accessToken;
}

let refreshInFlight: Promise<string | null> | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;

export function setRefreshHandler(h: () => Promise<string | null>): void {
  refreshHandler = h;
}

async function runRefresh(): Promise<string | null> {
  if (!refreshHandler) return null;
  if (!refreshInFlight) {
    refreshInFlight = refreshHandler()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  skipRefresh?: boolean;
};

async function rawFetch<T>(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...(opts.headers ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  const url = `${CONFIG.API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  
  // BUG FIX: Add a 10-second timeout so the app never hangs forever
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError(408, 'TIMEOUT', 'The request took too long. Check your connection.');
    }
    throw err;
  }
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await rawFetch<T>(path, opts, accessToken);

  if (res.status === 401 && !opts.skipRefresh) {
    const newToken = await runRefresh();
    if (newToken) {
      setAccessToken(newToken);
      res = await rawFetch<T>(path, opts, newToken);
    }
  }

  if (res.status === 204) return null as unknown as T;

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = null; }
  }

  if (!res.ok) {
    const err = (parsed as any)?.error;
    const code = err?.code ?? `HTTP_${res.status}`;
    const message = err?.message ?? userMessageFor(code);
    throw new ApiError(res.status, code, message, err?.details, err?.requestId);
  }

  const env = parsed as ApiEnvelope<T> | T | null;
  if (env && typeof env === 'object' && 'data' in env) {
    return (env as ApiEnvelope<T>).data;
  }
  return env as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  del: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
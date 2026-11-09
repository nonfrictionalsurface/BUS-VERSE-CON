import { CONFIG } from '../config';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  /** Error codes expected by the caller — logged as debug, not error */
  expectedCodes?: string[];
}

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let refreshInFlight: Promise<string> | null = null;

export function setAccessToken(t: string | null) {
  accessToken = t;
  console.log('[session] accessToken ' + (t ? 'SET' : 'cleared'));
}
export function getAccessToken() { return accessToken; }
export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn; }

interface RefreshAttemptResult {
  ok: boolean;
  token?: string;
  definitive401?: boolean;
}

async function doRefreshOnce(): Promise<RefreshAttemptResult> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('bv_refresh_token') : null;
  if (!refreshToken) return { ok: false };

  try {
    const res = await fetch(`${CONFIG.API_BASE}/passenger/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, definitive401: true };
    }
    if (!res.ok) return { ok: false };

    const payload = await res.json();
    const data = payload?.data ?? payload;
    accessToken = data.accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('bv_refresh_token', data.refreshToken);
    }
    return { ok: true, token: data.accessToken };
  } catch {
    return { ok: false };
  }
}

export async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    let result = await doRefreshOnce();
    if (!result.ok && !result.definitive401) {
      await new Promise((r) => setTimeout(r, 500));
      result = await doRefreshOnce();
    }
    if (!result.ok) {
      throw new ApiError(
        401,
        result.definitive401 ? 'REFRESH_FAILED' : 'REFRESH_UNAVAILABLE',
        result.definitive401 ? 'Session expired' : 'Could not refresh session',
      );
    }
    return result.token!;
  })().finally(() => { refreshInFlight = null; });

  return refreshInFlight;
}

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const url = CONFIG.API_BASE + path;
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (!init.skipAuth && accessToken) headers['Authorization'] = 'Bearer ' + accessToken;

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && !init.skipAuth) {
    try {
      const newToken = await refreshAccessToken();
      headers['Authorization'] = 'Bearer ' + newToken;
      res = await fetch(url, { ...init, headers });
    } catch (err: any) {
      if (err?.code === 'REFRESH_FAILED') {
        if (onUnauthorized) onUnauthorized();
      }
      throw err;
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const code = data?.error?.code ?? 'HTTP_' + res.status;
    const msg = data?.error?.message ?? 'Request failed';
    const details = data?.error?.details;

    const isExpected = (init.expectedCodes ?? []).includes(code) || (init.expectedCodes ?? []).includes('*');

    if (isExpected) {
      // Handled by caller — suppress dev overlay
      console.debug(`[API] ${code} ${res.status} ${path} (expected)`);
    } else {
      console.error(`[API] ${code} ${res.status} ${path}`);
      if (details !== undefined) console.error('[API] Details:', details);
    }

    throw new ApiError(res.status, code, msg, details);
  }

  return (data?.data !== undefined ? data.data : data) as T;
}

export const api = {
  get: <T>(p: string, opts: RequestOptions = {}) => request<T>(p, { ...opts, method: 'GET' }),
  post: <T>(p: string, body: unknown, opts: RequestOptions = {}) => request<T>(p, { ...opts, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(p: string, body: unknown, opts: RequestOptions = {}) => request<T>(p, { ...opts, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(p: string, body: unknown, opts: RequestOptions = {}) => request<T>(p, { ...opts, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(p: string, opts: RequestOptions = {}) => request<T>(p, { ...opts, method: 'DELETE' }),
};
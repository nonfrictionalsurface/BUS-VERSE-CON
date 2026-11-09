import { ApiResponse, ApiError, ApiErrorResponse, Surface } from './types';
import { CONFIG } from '../config';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Options {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;
let isRefreshing = false;
let subscribers: Array<(token: string) => void> = [];

class HttpClient {
  private baseUrl: string;
  private surface: Surface | null = null;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? CONFIG.API_BASE : 'http://localhost:4310/v1';
    if (typeof window !== 'undefined') {
      this.surface = (localStorage.getItem('buscon_surface') as Surface | null);
    }
  }

  public setSurface(surface: Surface | null): void {
    this.surface = surface;
    if (typeof window === 'undefined') return;
    if (surface) localStorage.setItem('buscon_surface', surface);
    else localStorage.removeItem('buscon_surface');
  }

  private getAccess(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('buscon_access_token') : null;
  }
  private getRefresh(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('buscon_refresh_token') : null;
  }
  private saveTokens(access: string, refresh: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('buscon_access_token', access);
    localStorage.setItem('buscon_refresh_token', refresh);
  }
  private clearAuth(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('buscon_access_token');
    localStorage.removeItem('buscon_refresh_token');
    localStorage.removeItem('buscon_user');
    localStorage.removeItem('buscon_surface');
    this.surface = null;
    window.dispatchEvent(new CustomEvent('buscon:auth:logout'));
  }

  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async refreshTokens(): Promise<string> {
    const refreshToken = this.getRefresh();
    if (!refreshToken || !this.surface) {
      this.clearAuth();
      throw new ApiError(401, { code: 'SESSION_REVOKED', message: 'Session expired.' });
    }
    const res = await fetch(this.baseUrl + '/' + this.surface + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      this.clearAuth();
      throw new ApiError(res.status, { code: 'SESSION_REVOKED', message: 'Session expired.' });
    }
    const payload = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
    this.saveTokens(payload.data.accessToken, payload.data.refreshToken);
    return payload.data.accessToken;
  }

  public async request<T>(endpoint: string, opts: Options = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, skipAuth = false, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
    const url = this.baseUrl + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
    // Only send Content-Type when there's actually a body to send.
    // Fastify rejects empty-body requests that declare application/json.
    const reqHeaders: Record<string, string> = { ...headers };

    if (!skipAuth) {
      const token = this.getAccess();
      if (token) reqHeaders.Authorization = 'Bearer ' + token;
    }

    const init: RequestInit = { method, headers: reqHeaders };
    if (body !== undefined && method !== 'GET') {
      reqHeaders['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await this.fetchWithTimeout(url, init, timeoutMs);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new ApiError(408, { code: 'REQUEST_TIMEOUT', message: 'Request timed out after ' + (timeoutMs / 1000) + 's.' });
      }
      throw new ApiError(0, { code: 'NETWORK_ERROR', message: err?.message || 'Network request failed.' });
    }

    if (response.status === 401 && !skipAuth) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const fresh = await this.refreshTokens();
          subscribers.forEach((cb) => cb(fresh));
          subscribers = [];
        } catch (err) {
          subscribers = [];
          throw err;
        } finally {
          isRefreshing = false;
        }
      }
      return new Promise((resolve, reject) => {
        subscribers.push(async (token) => {
          try {
            const retryHeaders = { ...reqHeaders, Authorization: 'Bearer ' + token };
            const replayed = await this.fetchWithTimeout(url, { ...init, headers: retryHeaders }, timeoutMs);
            resolve(await this.parse<T>(replayed, method));
          } catch (err) { reject(err); }
        });
      });
    }

    return this.parse<T>(response, method);
  }

  private async parse<T>(response: Response, method: string): Promise<ApiResponse<T>> {
    const endpoint = endpointOf(response.url);

    // Read body as text FIRST — this works for 200, 204, and error responses
    let rawText = '';
    try { rawText = await response.text(); } catch { /* ignore */ }
    const trimmed = rawText.trim();

    // 204 No Content OR empty body = success with no payload
    if (response.status === 204 || trimmed === '') {
      if (!response.ok) {
        // Non-2xx with empty body — still an error
        const errDetail = {
          code: 'HTTP_' + response.status,
          message: response.statusText || ('Request failed (HTTP ' + response.status + ')'),
        };
        console.error('[HTTP] ' + response.status + ' (empty body) -> ' + method + ' ' + endpoint);
        throw new ApiError(response.status, errDetail);
      }
      // 2xx with empty body = success, no data
      return { data: {} as T };
    }

    // Try to parse as JSON
    let parsed: any = null;
    let parseError: any = null;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      parseError = e;
    }

    if (!response.ok) {
      // Error response — extract structured error or fall back
      let errDetail: any = null;
      if (parsed) {
        if (parsed.error && typeof parsed.error === 'object' && (parsed.error.code || parsed.error.message)) {
          errDetail = parsed.error;
        } else if (parsed.code || parsed.message) {
          errDetail = parsed;
        }
      }

      if (!errDetail) {
        errDetail = {
          code: 'HTTP_' + response.status,
          message:
            response.status === 401 ? 'Not authorized — please sign in again.' :
            response.status === 403 ? 'You do not have access to this resource.' :
            response.status === 404 ? 'Not found.' :
            response.status === 429 ? 'Too many requests — please slow down.' :
            response.status >= 500 ? ('Server error (HTTP ' + response.status + ').') :
            response.statusText || ('Request failed (HTTP ' + response.status + ')'),
        };
      }

      const hasStructuredError = !!(errDetail?.code && errDetail?.message);
      const isExpected = hasStructuredError && response.status >= 400 && response.status < 500;
      if (isExpected) {
        console.debug('[HTTP] ' + response.status + ' ' + errDetail.code + ' -> ' + method + ' ' + endpoint + ' (handled)');
      } else {
        console.error('[HTTP] ' + response.status + ' ' + errDetail.code + ' -> ' + method + ' ' + endpoint +
          '\n  message: ' + errDetail.message +
          '\n  raw body: ' + (trimmed.slice(0, 500) || '(empty)') +
          (parseError ? '\n  parse error: ' + String(parseError) : ''));
      }
      throw new ApiError(response.status, errDetail);
    }

    // Success response but invalid JSON
    if (parseError) {
      throw new ApiError(response.status, {
        code: 'INVALID_RESPONSE',
        message: 'Expected JSON but got: ' + trimmed.slice(0, 200),
      });
    }

    return parsed as ApiResponse<T>;
  }

  public get<T>(endpoint: string) { return this.request<T>(endpoint, { method: 'GET' }); }
  public post<T>(endpoint: string, body?: unknown, opts: Omit<Options, 'method' | 'body'> = {}) {
    return this.request<T>(endpoint, { method: 'POST', body, ...opts });
  }
  public put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }
  public patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }
  public delete<T>(endpoint: string) { return this.request<T>(endpoint, { method: 'DELETE' }); }
}

function endpointOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url;
  }
}

export const api = new HttpClient();


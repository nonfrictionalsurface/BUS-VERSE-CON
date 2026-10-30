import { ApiResponse, ApiError, ApiErrorResponse } from './types';
import { CONFIG } from '../config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  skipAuth?: boolean;
}

// Global refresh queue to avoid token refresh races across concurrent calls
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

export class HttpClient {
  private baseUrl: string;

  constructor() {
    // In browser: use relative '/api/v1' to hit Next.js rewrite proxy (zero CORS drift)
    // Server-side: use absolute backend URL from config
    this.baseUrl = typeof window !== 'undefined' ? '/api/v1' : CONFIG.API_BASE;
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('busverse_access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('busverse_refresh_token');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('busverse_access_token', accessToken);
    localStorage.setItem('busverse_refresh_token', refreshToken);
  }

  private clearAuthAndLogout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('busverse_access_token');
    localStorage.removeItem('busverse_refresh_token');
    localStorage.removeItem('busverse_user');
    window.dispatchEvent(new CustomEvent('busverse:auth:logout'));
  }

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, idempotencyKey, skipAuth = false } = options;

    const targetUrl = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-Id': `req_${crypto.randomUUID().slice(0, 12)}`,
      ...headers,
    };

    if (idempotencyKey) {
      requestHeaders['Idempotency-Key'] = idempotencyKey;
    }

    if (!skipAuth) {
      const token = this.getAccessToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body !== undefined && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(targetUrl, config);

    // 401 Unauthorized handling: Auto-rotate access token and replay
    if (response.status === 401 && !skipAuth) {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        this.clearAuthAndLogout();
        const errJson = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw new ApiError(401, errJson.error || { code: 'TOKEN_EXPIRED', message: 'Session expired' });
      }

      if (!isRefreshing) {
        isRefreshing = true;

        this.performTokenRefresh(refreshToken)
          .then((newAccessToken) => {
            isRefreshing = false;
            onTokenRefreshed(newAccessToken);
          })
          .catch((refreshErr) => {
            isRefreshing = false;
            refreshSubscribers = [];
            this.clearAuthAndLogout();
            throw refreshErr;
          });
      }

      // Wait for active refresh to resolve, then replay original request
      return new Promise((resolve, reject) => {
        addRefreshSubscriber(async (newAccessToken: string) => {
          try {
            requestHeaders['Authorization'] = `Bearer ${newAccessToken}`;
            const replayed = await fetch(targetUrl, { ...config, headers: requestHeaders });
            const data = await this.handleResponse<T>(replayed);
            resolve(data);
          } catch (replayErr) {
            reject(replayErr);
          }
        });
      });
    }

    // 403 Forbidden: NON-NEGOTIABLE RULE 8.3 — NEVER attempt refresh on 403 (role mismatch)
    return this.handleResponse<T>(response);
  }

  private async performTokenRefresh(refreshToken: string): Promise<string> {
    const refreshUrl = `${this.baseUrl}/passenger/auth/refresh`;
    const res = await fetch(refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      this.clearAuthAndLogout();
      throw new ApiError(res.status, {
        code: 'SESSION_REVOKED',
        message: 'Your credentials could not be rotated. Please log in again.',
      });
    }

    const payload = (await res.json()) as ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>;

    this.setTokens(payload.data.accessToken, payload.data.refreshToken);
    return payload.data.accessToken;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errorJson = (await response.json()) as ApiErrorResponse;
        throw new ApiError(
          response.status,
          errorJson.error || {
            code: 'INTERNAL_ERROR',
            message: `Request failed with status ${response.status}`,
          }
        );
      }
      throw new ApiError(response.status, {
        code: 'NETWORK_ERROR',
        message: response.statusText || 'Network request failed',
      });
    }

    if (response.status === 204) {
      return { data: {} as T };
    }

    return (await response.json()) as ApiResponse<T>;
  }

  // Convenience verbs
  public get<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  public post<T>(endpoint: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(endpoint, { method: 'POST', body, ...options });
  }

  public patch<T>(endpoint: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }

  public delete<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

export const api = new HttpClient();

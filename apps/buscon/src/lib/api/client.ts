import { ApiResponse, ApiError, ApiErrorResponse, Surface } from './types';
import { CONFIG } from '../config';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Options {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

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

  private async refreshTokens(): Promise<string> {
    const refreshToken = this.getRefresh();
    if (!refreshToken || !this.surface) {
      this.clearAuth();
      throw new ApiError(401, { code: 'SESSION_REVOKED', message: 'Session expired.' });
    }

    const res = await fetch(`${this.baseUrl}/${this.surface}/auth/refresh`, {
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
    const { method = 'GET', body, headers = {}, skipAuth = false } = opts;
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };

    if (!skipAuth) {
      const token = this.getAccess();
      if (token) reqHeaders.Authorization = `Bearer ${token}`;
    }

    const init: RequestInit = { method, headers: reqHeaders };
    if (body !== undefined && method !== 'GET') init.body = JSON.stringify(body);

    const response = await fetch(url, init);

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
            const retryHeaders = { ...reqHeaders, Authorization: `Bearer ${token}` };
            const replayed = await fetch(url, { ...init, headers: retryHeaders });
            resolve(await this.parse<T>(replayed));
          } catch (err) { reject(err); }
        });
      });
    }

    return this.parse<T>(response);
  }

  private async parse<T>(response: Response): Promise<ApiResponse<T>> {
    const ct = response.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errJson = (await response.json()) as ApiErrorResponse;
        throw new ApiError(response.status, errJson.error || { code: 'INTERNAL_ERROR', message: response.statusText });
      }
      throw new ApiError(response.status, { code: 'NETWORK_ERROR', message: response.statusText || 'Network error' });
    }

    if (response.status === 204) return { data: {} as T };
    return (await response.json()) as ApiResponse<T>;
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

export const api = new HttpClient();
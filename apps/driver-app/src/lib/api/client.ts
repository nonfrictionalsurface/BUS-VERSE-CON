import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const FALLBACK_URL = 'http://10.57.155.179:4310/v1';

function resolveBaseUrl(): string {
  const env = (process.env.EXPO_PUBLIC_API_BASE ?? '').trim();
  if (env) {
    return env.replace(/\/+$/, '');
  }
  return FALLBACK_URL;
}

const BASE_URL = resolveBaseUrl();
console.log('[API] Base URL = ' + BASE_URL);

let memoryToken: string | null = null;

export async function setToken(token: string | null) {
  memoryToken = token;
  try {
    if (Platform.OS !== 'web') {
      if (token) await SecureStore.setItemAsync('access_token', token);
      else await SecureStore.deleteItemAsync('access_token');
    } else {
      if (token) localStorage.setItem('access_token', token);
      else localStorage.removeItem('access_token');
    }
  } catch (e) { console.log('setToken error:', e); }
}

export async function getToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  try {
    if (Platform.OS !== 'web') {
      memoryToken = await SecureStore.getItemAsync('access_token');
    } else {
      memoryToken = localStorage.getItem('access_token');
    }
  } catch { memoryToken = null; }
  return memoryToken;
}

export const api = {
  request: async (path: string, options: RequestInit = {}) => {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    console.log('[API] -> ' + (options.method || 'GET') + ' ' + BASE_URL + path, options.body || '');

    try {
      const url = BASE_URL + path;
      const res = await fetch(url, { ...options, headers });
      if (res.status === 204) return null;

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      console.log('[API] <- ' + res.status + ' ' + url, data);

      if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
      return (data && data.data !== undefined) ? data.data : data;
    } catch (err: any) {
      console.log('[API] ERROR ' + BASE_URL + path, err.message);
      throw err;
    }
  },
  get: (path: string) => api.request(path),
  post: (path: string, body: any) => api.request(path, { method: 'POST', body: JSON.stringify(body) }),
};

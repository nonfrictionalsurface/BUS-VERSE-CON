import { io, Socket } from 'socket.io-client';
import { CONFIG } from '../config';

type Envelope = { event: string; data: Record<string, unknown>; ts: string };
type Listener = (data: Record<string, unknown>, ts: string) => void;

class WsManager {
  private socket: Socket | null = null;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private topics = new Set<string>();
  private listeners = new Map<string, Set<Listener>>();
  private reconnecting = false;

  setTokens(access: string | null, refresh: string | null): void {
    this.token = access;
    this.refreshToken = refresh;
  }

  connect(): void {
    if (this.socket?.connected) return;
    if (!this.token) return;

    this.socket?.disconnect();
    this.socket = io(CONFIG.WS_URL, {
      path: CONFIG.WS_PATH,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: CONFIG.WS_MAX_RETRIES,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
    });

    this.socket.on('connect', () => {
      this.reconnecting = false;
      this.socket?.emit('message', { action: 'auth', token: this.token });
    });

    this.socket.on('auth:ok', () => {
      if (this.topics.size > 0) {
        this.socket?.emit('message', { action: 'subscribe', topics: Array.from(this.topics) });
      }
    });

    this.socket.on('auth:expiring', () => {
      if (this.refreshToken) {
        this.socket?.emit('message', { action: 'auth:refresh', refreshToken: this.refreshToken });
      }
    });

    this.socket.on('auth:refreshed', (payload: { accessToken: string; refreshToken: string }) => {
      this.token = payload.accessToken;
      this.refreshToken = payload.refreshToken;
    });

    this.socket.on('message', (env: Envelope) => {
      if (!env?.event) return;
      const set = this.listeners.get(env.event);
      if (!set) return;
      set.forEach((fn) => {
        try {
          fn(env.data ?? {}, env.ts ?? new Date().toISOString());
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[ws] listener threw', env.event, err);
        }
      });
    });

    this.socket.on('disconnect', () => {
      this.reconnecting = true;
    });
  }

  subscribe(topic: string): void {
    this.topics.add(topic);
    if (this.socket?.connected) {
      this.socket.emit('message', { action: 'subscribe', topics: [topic] });
    }
  }

  unsubscribe(topic: string): void {
    this.topics.delete(topic);
    if (this.socket?.connected) {
      this.socket.emit('message', { action: 'unsubscribe', topics: [topic] });
    }
  }

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  disconnect(): void {
    this.topics.clear();
    this.listeners.clear();
    this.socket?.disconnect();
    this.socket = null;
    this.token = null;
    this.refreshToken = null;
    this.reconnecting = false;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsManager = new WsManager();
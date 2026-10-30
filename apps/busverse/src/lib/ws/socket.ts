import { io, Socket } from 'socket.io-client';
import { CONFIG } from '../config';

type SocketEventListener = (payload: any) => void;

class WebSocketManager {
  private socket: Socket | null = null;
  private subscribedTopics: Set<string> = new Set();
  private listeners: Map<string, Set<SocketEventListener>> = new Map();
  private authTimeoutTimer: NodeJS.Timeout | null = null;

  public connect(accessToken: string) {
    if (this.socket && this.socket.connected) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    // Connect to backend Fastify Socket.io server
    this.socket = io(CONFIG.WS_URL, {
      path: '/v1/ws',
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
      reconnectionAttempts: 5,
      autoConnect: true,
    });

    // RULE 8.11: Handshake timing — server terminates after 5s if auth is delayed
    this.socket.on('connect', () => {
      this.socket?.emit('message', {
        action: 'auth',
        token: accessToken,
      });

      // Clear safeguard timer once connect initiates
      if (this.authTimeoutTimer) clearTimeout(this.authTimeoutTimer);
    });

    this.socket.on('auth:ok', () => {
      // Re-subscribe to all active topics on reconnection
      if (this.subscribedTopics.size > 0) {
        this.socket?.emit('message', {
          action: 'subscribe',
          topics: Array.from(this.subscribedTopics),
        });
      }
    });

    // Server sends auth:expiring at (exp - 60s)
    this.socket.on('auth:expiring', async () => {
      const refreshToken = localStorage.getItem('busverse_refresh_token');
      if (refreshToken && this.socket) {
        this.socket.emit('message', {
          action: 'auth:refresh',
          refreshToken,
        });
      }
    });

    this.socket.on('auth:refreshed', (data: { accessToken: string; refreshToken: string }) => {
      localStorage.setItem('busverse_access_token', data.accessToken);
      localStorage.setItem('busverse_refresh_token', data.refreshToken);
    });

    // General message router for incoming events
    this.socket.on('message', (msg: { event?: string; topic?: string; data?: any }) => {
      if (msg.event) {
        const topicListeners = this.listeners.get(msg.event);
        if (topicListeners) {
          topicListeners.forEach((listener) => listener(msg.data));
        }
      }
    });

    // Close code management
    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Closed by server (e.g., Code 4001, 4003 or 1008)
        const freshToken = localStorage.getItem('busverse_access_token');
        if (freshToken) {
          setTimeout(() => this.connect(freshToken), 1500);
        }
      }
    });
  }

  public subscribe(topics: string | string[]) {
    const topicArray = Array.isArray(topics) ? topics : [topics];
    topicArray.forEach((t) => this.subscribedTopics.add(t));

    if (this.socket?.connected) {
      this.socket.emit('message', {
        action: 'subscribe',
        topics: topicArray,
      });
    }
  }

  public unsubscribe(topics: string | string[]) {
    const topicArray = Array.isArray(topics) ? topics : [topics];
    topicArray.forEach((t) => this.subscribedTopics.delete(t));

    if (this.socket?.connected) {
      this.socket.emit('message', {
        action: 'unsubscribe',
        topics: topicArray,
      });
    }
  }

  public on(event: string, callback: SocketEventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Also register on underlying socket instance
    this.socket?.on(event, callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
      this.socket?.off(event, callback);
    };
  }

  public disconnect() {
    if (this.authTimeoutTimer) clearTimeout(this.authTimeoutTimer);
    this.subscribedTopics.clear();
    this.listeners.clear();
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const wsManager = new WebSocketManager();

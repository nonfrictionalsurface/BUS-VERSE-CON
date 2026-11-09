import { io, Socket } from 'socket.io-client';
import { refreshAccessToken } from '@/lib/api/client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4310';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function connectSocket(token: string): Socket {
  currentToken = token;

  if (socket?.connected) {
    return socket;
  }

  socket = io(WS_URL, {
    path: '/v1/ws',
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 16000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('[ws] connected, authenticating…');
    socket!.emit('message', { action: 'auth', token: currentToken });
  });

  socket.on('auth:ok', (payload: any) => {
    console.log('[ws] auth ok:', payload?.role);
  });

  socket.on('auth:expiring', async () => {
    console.log('[ws] token expiring, refreshing…');
    try {
      const newToken = await refreshAccessToken();
      currentToken = newToken;
      const refreshToken =
        typeof window !== 'undefined' ? localStorage.getItem('bv_refresh_token') : null;
      socket!.emit('message', { action: 'auth:refresh', refreshToken });
    } catch (err) {
      console.warn('[ws] auth refresh failed:', err);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[ws] disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[ws] connect error:', err.message);
  });

  return socket;
}

export function subscribe(topics: string[]) {
  socket?.emit('message', { action: 'subscribe', topics });
  console.log('[ws] subscribe →', topics);
}

export function unsubscribe(topics: string[]) {
  socket?.emit('message', { action: 'unsubscribe', topics });
  console.log('[ws] unsubscribe →', topics);
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
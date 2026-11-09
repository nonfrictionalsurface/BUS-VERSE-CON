'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from './socket';

/**
 * Subscribe to a specific event on a specific topic.
 * The server publishes events as:
 *   socket.emit('message', { event, topic, data, ts })
 */
export function useWsEvent<T = any>(
  topic: string,
  eventName: string,
  handler: (data: T) => void,
  enabled = true,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    if (!socket) return;

    const listener = (msg: any) => {
      if (msg?.topic === topic && msg?.event === eventName) {
        handlerRef.current(msg.data as T);
      }
    };

    socket.on('message', listener);
    return () => {
      socket.off('message', listener);
    };
  }, [topic, eventName, enabled]);
}
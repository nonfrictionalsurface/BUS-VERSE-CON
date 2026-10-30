'use client';

import { useEffect } from 'react';
import { wsManager } from './socket';

/**
 * useWsEvent hook
 * Subscribes to a WebSocket topic and attaches a listener with automatic cleanup.
 */
export function useWsEvent<T = any>(
  topic: string | null,
  event: string,
  handler: (payload: T) => void
) {
  useEffect(() => {
    if (!topic) return;

    wsManager.subscribe(topic);
    const unbind = wsManager.on(event, handler);

    return () => {
      unbind();
      wsManager.unsubscribe(topic);
    };
  }, [topic, event, handler]);
}

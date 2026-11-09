import { useEffect } from 'react';
import { wsManager } from './socket';

/** Subscribe to a single WS event for the lifetime of the component. */
export function useWsEvent(
  event: string,
  handler: (data: Record<string, unknown>, ts: string) => void,
): void {
  useEffect(() => {
    const off = wsManager.on(event, handler);
    return off;
  }, [event, handler]);
}

/** Subscribe to a WS topic for the lifetime of the component. */
export function useWsTopic(topic: string | null): void {
  useEffect(() => {
    if (!topic) return;
    wsManager.subscribe(topic);
    return () => wsManager.unsubscribe(topic);
  }, [topic]);
}
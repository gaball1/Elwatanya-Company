import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationService } from '@/services/notification.service';

let cachedUnreadCount = 0;
let listeners: Array<(count: number) => void> = [];

const POLL_INTERVAL_MS = 30_000;

function notifyListeners() {
  for (const listener of listeners) listener(cachedUnreadCount);
}

export async function refreshUnreadCount(): Promise<number> {
  try {
    const items = await notificationService.list();
    cachedUnreadCount = items.filter((n) => !n.read).length;
  } catch {
    // keep existing count on failure
  }
  notifyListeners();
  return cachedUnreadCount;
}

export function useUnreadCount(): { unreadCount: number; refresh: () => Promise<number> } {
  const [unreadCount, setCount] = useState(cachedUnreadCount);
  const refreshRef = useRef<() => Promise<number>>(async () => cachedUnreadCount);

  useEffect(() => {
    const listener = (count: number) => setCount(count);
    listeners.push(listener);
    refreshRef.current();
    const interval = setInterval(() => {
      refreshRef.current().catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const refresh = useCallback(() => refreshUnreadCount(), []);
  refreshRef.current = refresh;

  return { unreadCount, refresh };
}

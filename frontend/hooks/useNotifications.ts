import { useCallback, useEffect, useState } from 'react';
import { notificationService } from '@/services/notification.service';

let cachedUnreadCount = 0;
let listeners: Array<(count: number) => void> = [];

const POLL_INTERVAL_MS = 30_000;

function notifyListeners() {
  for (const listener of listeners) listener(cachedUnreadCount);
}

export async function refreshUnreadCount(): Promise<number> {
  try {
    cachedUnreadCount = await notificationService.unreadCount();
  } catch {
    // keep existing count on failure
  }
  notifyListeners();
  return cachedUnreadCount;
}

export function resetUnreadCount(): void {
  cachedUnreadCount = 0;
  notifyListeners();
}

export function useUnreadCount(): { unreadCount: number; refresh: () => Promise<number> } {
  const [unreadCount, setCount] = useState(cachedUnreadCount);
  const refresh = useCallback(() => refreshUnreadCount(), []);

  useEffect(() => {
    const listener = (count: number) => setCount(count);
    listeners.push(listener);
    refresh().catch(() => {});
    const interval = setInterval(() => {
      refresh().catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      listeners = listeners.filter((l) => l !== listener);
    };
  }, [refresh]);

  return { unreadCount, refresh };
}

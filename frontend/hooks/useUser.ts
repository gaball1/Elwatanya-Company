import { useCallback, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/apiClient';

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  projectId?: string | null;
  permissions?: string[];
  roleNames?: string[];
  projectIds?: string[];
  employeeId?: string | null;
  avatarUrl?: string | null;
  status?: string;
}

let cachedUser: UserInfo | null = null;
let listeners: Array<(user: UserInfo | null) => void> = [];

function notifyListeners() {
  for (const listener of listeners) {
    listener(cachedUser);
  }
}

// Try to restore from localStorage
try {
  const stored = localStorage.getItem('currentUser');
  if (stored) cachedUser = JSON.parse(stored);
} catch {}

export function setUser(user: UserInfo | null) {
  cachedUser = user;
  if (user) localStorage.setItem('currentUser', JSON.stringify(user));
  else localStorage.removeItem('currentUser');
  notifyListeners();
}

export function useUser(): { user: UserInfo | null; loading: boolean; refresh: () => Promise<void> } {
  const [user, setUserState] = useState<UserInfo | null>(cachedUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const listener = (u: UserInfo | null) => setUserState(u);
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient<{ user: UserInfo }>('/auth/me');
      const userData = data.user ?? data;
      setUser(userData);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  return { user, loading, refresh };
}

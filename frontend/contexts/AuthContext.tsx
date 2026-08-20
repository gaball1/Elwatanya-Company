"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@/types/user";
import { apiClient, ApiError } from "@/lib/api/apiClient";
import { isNetworkError } from "@/lib/api/fetchTransport";
import {
  getAccessToken,
  saveAccessToken,
} from "@/lib/api/tokenStorage";
import {
  authService,
  type AuthResponse,
  type AuthUser,
} from "@/services/auth.service";
import { setUser as setCachedUser } from "@/hooks/useUser";
import { resetUnreadCount } from "@/hooks/useNotifications";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_ROUTES = new Set(["", "/login", "/register", "/forgot-password"]);

function mapApiUserToUser(apiUser: AuthUser & { createdAt?: string }): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    role: apiUser.role,
    status: apiUser.status ?? "ACTIVE",
    projectId: apiUser.projectId,
    permissions: apiUser.permissions,
    roleNames: apiUser.roleNames,
    projectIds: apiUser.projectIds,
    employeeId: apiUser.employeeId,
    avatarUrl: apiUser.avatarUrl ?? null,
    createdAt: apiUser.createdAt ?? new Date().toISOString(),
  };
}

function getLocaleFromPathname(pathname: string): string {
  const locale = pathname.split("/")[1];
  return locale === "en" ? "en" : "ar";
}

function isProtectedRoute(pathname: string): boolean {
  const match = pathname.match(/^\/(ar|en)(\/.*)?$/);
  if (!match) return false;
  return !PUBLIC_ROUTES.has(match[2] ?? "");
}

function isTransientFailure(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 408;
  return isNetworkError(error);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        localStorage.removeItem("elwataniya_user");
      } catch {
        // ignore
      }

      const hasAccess = getAccessToken();

      if (hasAccess) {
        try {
          const { user: currentUser } = await authService.getCurrentUser();
          const mapped = mapApiUserToUser(currentUser);
          if (!cancelled) {
            resetUnreadCount();
            setUser(mapped);
            setCachedUser(mapped);
            setLoading(false);
          }
          return;
        } catch (error) {
          if (isTransientFailure(error)) {
            if (!cancelled) setLoading(false);
            return;
          }
        }
      }

      try {
        await authService.refresh();
        const { user: currentUser } = await authService.getCurrentUser();
        const mapped = mapApiUserToUser(currentUser);
        if (!cancelled) {
          resetUnreadCount();
          setUser(mapped);
          setCachedUser(mapped);
        }
      } catch (error) {
        if (isTransientFailure(error)) {
          if (!cancelled) setLoading(false);
          return;
        }
        try {
          await authService.logout();
        } catch {
          // ignore
        }
        if (!cancelled) {
          resetUnreadCount();
          setUser(null);
          setCachedUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || user || !isProtectedRoute(pathname)) {
      return;
    }
    const locale = getLocaleFromPathname(pathname);
    router.replace(`/${locale}/login`);
  }, [loading, user, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) {
      return null;
    }

    const data = await authService.login(email, password);
    const mapped = mapApiUserToUser(data.user);
    resetUnreadCount();
    setUser(mapped);
    setCachedUser(mapped);
    return mapped;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      if (!name || !email || !password) {
        return false;
      }

      try {
        const data = await apiClient<AuthResponse>("/auth/register", {
          method: "POST",
          body: { name, email, password },
          skipAuth: true,
          skipAuthRetry: true,
        });
        saveAccessToken(data.accessToken);
        const mapped = mapApiUserToUser(data.user);
        resetUnreadCount();
        setUser(mapped);
        setCachedUser(mapped);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const logout = useCallback(() => {
    void authService.logout().finally(() => {
      resetUnreadCount();
      setUser(null);
      setCachedUser(null);
    });
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

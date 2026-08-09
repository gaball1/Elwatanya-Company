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
import { apiClient } from "@/lib/api/apiClient";
import {
  getAccessToken,
  getRefreshToken,
} from "@/lib/api/tokenStorage";
import {
  authService,
  type AuthResponse,
  type AuthUser,
} from "@/services/auth.service";
import { setUser as setCachedUser } from "@/hooks/useUser";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
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
      const hasRefresh = getRefreshToken();

      if (!hasAccess && !hasRefresh) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await authService.getCurrentUser();
        const mapped = mapApiUserToUser(currentUser);
        if (!cancelled) {
          setUser(mapped);
          setCachedUser(mapped);
        }
      } catch {
        try {
          await authService.refresh();
          const { user: currentUser } = await authService.getCurrentUser();
          const mapped = mapApiUserToUser(currentUser);
          if (!cancelled) {
            setUser(mapped);
            setCachedUser(mapped);
          }
        } catch {
          try {
            await authService.logout();
          } catch {
            // ignore
          }
          if (!cancelled) {
            setUser(null);
            setCachedUser(null);
          }
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
      return false;
    }

    try {
      const data = await authService.login(email, password);
      const mapped = mapApiUserToUser(data.user);
      setUser(mapped);
      setCachedUser(mapped);
      return true;
    } catch {
      return false;
    }
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
        const { saveAccessToken, saveRefreshToken } = await import("@/lib/api/tokenStorage");
        saveAccessToken(data.accessToken);
        saveRefreshToken(data.refreshToken);
        const mapped = mapApiUserToUser(data.user);
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

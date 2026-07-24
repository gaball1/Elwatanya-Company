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
import type { User, UserRole } from "@/types/user";
import { apiClient } from "@/lib/api/apiClient";
import {
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from "@/lib/api/tokenStorage";
import {
  authService,
  type AuthResponse,
  type AuthUser,
} from "@/services/auth.service";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LEGACY_USER_STORAGE_KEY = "elwataniya_user";

const PUBLIC_ROUTES = new Set(["", "/login", "/register", "/forgot-password"]);

function mapApiUserToUser(apiUser: AuthUser & { createdAt?: string }): User {
  const roleMap: Record<string, UserRole> = {
    CEO: "admin",
    TECHNICAL_OFFICE: "manager",
    ACCOUNTANT: "manager",
    SITE_ENGINEER: "viewer",
    STORE_MANAGER: "viewer",
    EMPLOYEE: "viewer",
    admin: "admin",
    manager: "manager",
    viewer: "viewer",
  };

  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    role: roleMap[apiUser.role] ?? "viewer",
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
        localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
      } catch {
        // ignore legacy cleanup errors
      }

      const hasToken = getAccessToken() || getRefreshToken();
      if (!hasToken) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await authService.getCurrentUser();
        if (!cancelled) setUser(mapApiUserToUser(currentUser));
      } catch {
        try {
          await authService.refresh();
          const { user: currentUser } = await authService.getCurrentUser();
          if (!cancelled) setUser(mapApiUserToUser(currentUser));
        } catch {
          await authService.logout();
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || user || !isProtectedRoute(pathname)) return;
    const locale = getLocaleFromPathname(pathname);
    router.replace(`/${locale}/login`);
  }, [loading, user, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) return false;

    try {
      const data = await authService.login(email, password);
      setUser(mapApiUserToUser(data.user));
      return true;
    } catch {
      return false;
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      if (!name || !email || !password) return false;

      try {
        const data = await apiClient<AuthResponse>("/auth/register", {
          method: "POST",
          body: { name, email, password },
          skipAuth: true,
          skipAuthRetry: true,
        });

        saveAccessToken(data.accessToken);
        saveRefreshToken(data.refreshToken);
        setUser(mapApiUserToUser(data.user));
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

import { apiClient } from "@/lib/api/apiClient";
import {
  clearTokens,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from "@/lib/api/tokenStorage";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  projectId?: string | null;
  permissions?: string[];
  roleNames?: string[];
  projectIds?: string[];
  employeeId?: string | null;
  status?: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface CurrentUserResponse {
  user: AuthUser & {
    status?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      skipAuth: true,
      skipAuthRetry: true,
    });
    saveAccessToken(data.accessToken);
    saveRefreshToken(data.refreshToken);
    return data;
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient<void>("/auth/logout", {
          method: "POST",
          body: { refreshToken },
          skipAuthRetry: true,
        });
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
  },

  async refresh(): Promise<AuthResponse> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    const data = await apiClient<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      skipAuth: true,
      skipAuthRetry: true,
    });
    saveAccessToken(data.accessToken);
    saveRefreshToken(data.refreshToken);
    return data;
  },

  async getCurrentUser(): Promise<CurrentUserResponse> {
    const result = await apiClient<CurrentUserResponse>("/auth/me");
    return result;
  },
};

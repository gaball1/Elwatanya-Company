import { apiClient } from "@/lib/api/apiClient";
import {
  clearTokens,
  saveAccessToken,
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
    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient<void>("/auth/logout", {
        method: "POST",
        body: {},
        skipAuthRetry: true,
        skipAuth: true,
      });
    } catch {
      // Ignore logout errors
    }
    clearTokens();
  },

  async refresh(): Promise<AuthResponse> {
    const data = await apiClient<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: {},
      skipAuth: true,
      skipAuthRetry: true,
    });
    saveAccessToken(data.accessToken);
    return data;
  },

  async getCurrentUser(): Promise<CurrentUserResponse> {
    const result = await apiClient<CurrentUserResponse>("/auth/me");
    return result;
  },
};

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

    try {
      if (refreshToken) {
        await apiClient<void>("/auth/logout", {
          method: "POST",
          body: { refreshToken },
          skipAuthRetry: true,
        });
      }
    } finally {
      clearTokens();
    }
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
    return apiClient<CurrentUserResponse>("/users/me");
  },
};

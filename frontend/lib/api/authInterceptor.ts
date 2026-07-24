import { API_BASE_URL } from "./env";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from "./tokenStorage";

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

let refreshPromise: Promise<boolean> | null = null;

export function attachAuthHeader(
  headers?: HeadersInit
): HeadersInit {
  const next = new Headers(headers);
  const token = getAccessToken();
  if (token && !next.has("Authorization")) {
    next.set("Authorization", `Bearer ${token}`);
  }
  return next;
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return false;
    }

    try {
      const base = API_BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearTokens();
        return false;
      }

      const data = (await response.json()) as RefreshResponse;
      saveAccessToken(data.accessToken);
      saveRefreshToken(data.refreshToken);
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

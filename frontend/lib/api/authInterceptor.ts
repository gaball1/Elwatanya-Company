import { API_BASE_URL } from "./env";
import { debugLog } from "./debug";
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
  debugLog("[AUTH_INTERCEPTOR] attachAuthHeader - has token:", !!token);
  if (token && !next.has("Authorization")) {
    next.set("Authorization", `Bearer ${token}`);
    debugLog("[AUTH_INTERCEPTOR] attachAuthHeader - set Authorization header");
  }
  return next;
}

export async function refreshAccessToken(): Promise<boolean> {
  debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - ENTERED");
  if (refreshPromise) {
    debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - already in progress, returning existing promise");
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - has refreshToken:", !!refreshToken);
    if (!refreshToken) {
      debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - NO refreshToken, clearing tokens");
      clearTokens();
      return false;
    }

    try {
      const base = API_BASE_URL.replace(/\/$/, "");
      const url = `${base}/auth/refresh`;
      debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - calling:", url);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - response status:", response.status);

      if (!response.ok) {
        debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - NOT ok, clearing tokens");
        clearTokens();
        return false;
      }

      const raw = await response.json();
      debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - raw response:", JSON.stringify(raw).substring(0, 200));

      let data: RefreshResponse;
      if (raw && raw.success && raw.data) {
        debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - unwrapping from success/data format");
        data = raw.data as RefreshResponse;
      } else if (raw && raw.accessToken) {
        debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - flat format");
        data = raw as RefreshResponse;
      } else {
        debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - UNEXPECTED response shape");
        clearTokens();
        return false;
      }
      debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - saving new tokens");
      saveAccessToken(data.accessToken);
      saveRefreshToken(data.refreshToken);
      debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - SUCCESS, returning true");
      return true;
    } catch (err) {
      debugLog("[AUTH_INTERCEPTOR] refreshAccessToken - ERROR:", (err as Error)?.message);
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

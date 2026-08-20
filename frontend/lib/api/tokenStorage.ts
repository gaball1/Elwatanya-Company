const ACCESS_TOKEN_KEY = "elwataniya_access_token";
const TOKEN_COOKIE_NAME = "elwataniya_token";

import { debugLog } from "./debug";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function extractTokenExp(token: string): string {
  const parts = token.split(".");
  if (parts.length < 2) return "1";
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      Array.from(atob(base64))
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp === "number") return String(payload.exp);
  } catch {
    // fall back to a presence marker
  }
  return "1";
}

function setTokenCookie(token: string): void {
  if (!isBrowser()) return;
  const secure =
    typeof window !== "undefined" &&
    window.location.protocol === "https:"
      ? ";Secure"
      : "";
  document.cookie = `${TOKEN_COOKIE_NAME}=${extractTokenExp(token)};path=/;SameSite=Lax${secure};max-age=604800`;
}

function removeTokenCookie(): void {
  if (!isBrowser()) return;
  const secure =
    typeof window !== "undefined" &&
    window.location.protocol === "https:"
      ? ";Secure"
      : "";
  document.cookie = `${TOKEN_COOKIE_NAME}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
}

export function saveAccessToken(token: string): void {
  debugLog("[TOKEN_STORAGE] saveAccessToken - ENTERED, token starts with:", token.substring(0, 10) + "...");
  if (!isBrowser()) { debugLog("[TOKEN_STORAGE] saveAccessToken - NOT browser, SKIP"); return; }
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  setTokenCookie(token);
  debugLog("[TOKEN_STORAGE] saveAccessToken - COMPLETED, localStorage now has:", !!localStorage.getItem(ACCESS_TOKEN_KEY), "cookie set");
}

export function saveRefreshToken(_token: string): void {
  debugLog("[TOKEN_STORAGE] saveRefreshToken - NO-OP (refresh token stored as HttpOnly cookie by backend)");
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  debugLog("[TOKEN_STORAGE] getAccessToken - returns:", !!token, token ? "starts with: " + token.substring(0, 10) : "null");
  return token;
}

export function getRefreshToken(): string | null {
  debugLog("[TOKEN_STORAGE] getRefreshToken - returns null (refresh token is HttpOnly cookie)");
  return null;
}

export function clearTokens(): void {
  debugLog("[TOKEN_STORAGE] clearTokens - ENTERED, had access:", !!localStorage.getItem(ACCESS_TOKEN_KEY));
  if (!isBrowser()) { debugLog("[TOKEN_STORAGE] clearTokens - NOT browser, SKIP"); return; }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  removeTokenCookie();
  debugLog("[TOKEN_STORAGE] clearTokens - COMPLETED, localStorage cleared, cookie removed");
}

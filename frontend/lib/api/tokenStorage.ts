const ACCESS_TOKEN_KEY = "elwataniya_access_token";
const REFRESH_TOKEN_KEY = "elwataniya_refresh_token";
const TOKEN_COOKIE_NAME = "elwataniya_token";

import { debugLog } from "./debug";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function setTokenCookie(token: string): void {
  if (!isBrowser()) return;
  document.cookie = `${TOKEN_COOKIE_NAME}=${token};path=/;SameSite=Lax;max-age=604800`;
}

function removeTokenCookie(): void {
  if (!isBrowser()) return;
  document.cookie = `${TOKEN_COOKIE_NAME}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function saveAccessToken(token: string): void {
  debugLog("[TOKEN_STORAGE] saveAccessToken - ENTERED, token starts with:", token.substring(0, 10) + "...");
  if (!isBrowser()) { debugLog("[TOKEN_STORAGE] saveAccessToken - NOT browser, SKIP"); return; }
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  setTokenCookie(token);
  debugLog("[TOKEN_STORAGE] saveAccessToken - COMPLETED, localStorage now has:", !!localStorage.getItem(ACCESS_TOKEN_KEY), "cookie set");
}

export function saveRefreshToken(token: string): void {
  debugLog("[TOKEN_STORAGE] saveRefreshToken - ENTERED, token starts with:", token.substring(0, 10) + "...");
  if (!isBrowser()) { debugLog("[TOKEN_STORAGE] saveRefreshToken - NOT browser, SKIP"); return; }
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
  debugLog("[TOKEN_STORAGE] saveRefreshToken - COMPLETED, localStorage now has:", !!localStorage.getItem(REFRESH_TOKEN_KEY));
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  debugLog("[TOKEN_STORAGE] getAccessToken - returns:", !!token, token ? "starts with: " + token.substring(0, 10) : "null");
  return token;
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  const token = localStorage.getItem(REFRESH_TOKEN_KEY);
  debugLog("[TOKEN_STORAGE] getRefreshToken - returns:", !!token, token ? "starts with: " + token.substring(0, 10) : "null");
  return token;
}

export function clearTokens(): void {
  debugLog("[TOKEN_STORAGE] clearTokens - ENTERED, had access:", !!localStorage.getItem(ACCESS_TOKEN_KEY), "had refresh:", !!localStorage.getItem(REFRESH_TOKEN_KEY));
  if (!isBrowser()) { debugLog("[TOKEN_STORAGE] clearTokens - NOT browser, SKIP"); return; }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  removeTokenCookie();
  debugLog("[TOKEN_STORAGE] clearTokens - COMPLETED, localStorage cleared, cookie removed");
}

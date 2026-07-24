const ACCESS_TOKEN_KEY = "elwataniya_access_token";
const REFRESH_TOKEN_KEY = "elwataniya_refresh_token";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveAccessToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function saveRefreshToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

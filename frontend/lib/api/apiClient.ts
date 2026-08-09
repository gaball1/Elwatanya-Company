import { API_BASE_URL } from "./env";
import { attachAuthHeader, refreshAccessToken } from "./authInterceptor";
import { debugLog } from "./debug";

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly code?: string;

  constructor(status: number, message: string, data?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = code;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeout?: number;
  skipAuth?: boolean;
  skipAuthRetry?: boolean;
  skipUnwrap?: boolean;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;
  debugLog("[API_CLIENT] buildUrl - path:", path, "→ url:", url);
  return url;
}

function parseErrorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string" && message.length > 0) return message;
  }
  return `Request failed with status ${status}`;
}

function unwrapResponse<T>(raw: unknown): T {
  debugLog("[API_CLIENT] unwrapResponse - ENTERED, raw type:", typeof raw, raw !== null ? "keys:" + Object.keys(raw as object).join(",") : "null");
  if (typeof raw === "object" && raw !== null && "success" in raw) {
    const resp = raw as { success: boolean; data?: T; code?: string; message?: string; errors?: any[] };
    debugLog("[API_CLIENT] unwrapResponse - has success field, success:", resp.success, "has data:", resp.data !== undefined);
    if (resp.success && resp.data !== undefined) {
      debugLog("[API_CLIENT] unwrapResponse - returning resp.data");
      return resp.data;
    }
    if (!resp.success) {
      debugLog("[API_CLIENT] unwrapResponse - success=false, throwing ApiError");
      throw new ApiError(400, resp.message ?? "Request failed", resp.errors, resp.code);
    }
  }
  debugLog("[API_CLIENT] unwrapResponse - no success field, returning raw");
  return raw as T;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  debugLog("[API_CLIENT] parseJsonSafe - status:", response.status, "body length:", text.length, "body preview:", text.substring(0, 100));
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function executeRequest(
  url: string,
  options: ApiRequestOptions
): Promise<Response> {
  const { body, timeout = DEFAULT_TIMEOUT_MS, headers, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  debugLog("[API_CLIENT] executeRequest - ENTERED, url:", url, "method:", (options as any).method, "has body:", body !== undefined, "content-type:", requestHeaders.get("Content-Type"));

  try {
    const fetchResult = await fetch(url, {
      ...rest,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    debugLog("[API_CLIENT] executeRequest - fetch COMPLETED, status:", fetchResult.status, "ok:", fetchResult.ok);
    return fetchResult;
  } catch (error) {
    debugLog("[API_CLIENT] executeRequest - fetch FAILED, error type:", (error as Error)?.name, "message:", (error as Error)?.message);
    if (error instanceof Error && error.name === "AbortError") {
      debugLog("[API_CLIENT] executeRequest - ABORT error (timeout)");
      throw new ApiError(408, "Request timed out");
    }
    debugLog("[API_CLIENT] executeRequest - re-throwing error");
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiClient<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const url = buildUrl(path);
  const { skipAuth = false, skipAuthRetry = false, skipUnwrap = false, ...requestOptions } =
    options;
  debugLog("[API_CLIENT] apiClient - ENTERED, path:", path, "method:", (options as any).method, "skipAuth:", skipAuth, "skipAuthRetry:", skipAuthRetry);

  const headers = skipAuth
    ? requestOptions.headers
    : attachAuthHeader(requestOptions.headers);

  debugLog("[API_CLIENT] apiClient - SENDING REQUEST to:", url);
  let response = await executeRequest(url, {
    ...requestOptions,
    headers,
  });
  debugLog("[API_CLIENT] apiClient - RESPONSE RECEIVED, status:", response.status, "ok:", response.ok);

  if (
    response.status === 401 &&
    !skipAuth &&
    !skipAuthRetry &&
    !path.includes("/auth/refresh")
  ) {
    debugLog("[API_CLIENT] apiClient - 401 received, attempting token refresh");
    const refreshed = await refreshAccessToken();
    debugLog("[API_CLIENT] apiClient - refresh result:", refreshed);
    if (refreshed) {
      response = await executeRequest(url, {
        ...requestOptions,
        headers: attachAuthHeader(requestOptions.headers),
      });
      debugLog("[API_CLIENT] apiClient - retry response status:", response.status);
    }
  }

  const data = await parseJsonSafe(response);
  debugLog("[API_CLIENT] apiClient - parsed data:", JSON.stringify(data).substring(0, 200));

  if (!response.ok) {
    debugLog("[API_CLIENT] apiClient - response NOT ok, throwing ApiError");
    throw new ApiError(
      response.status,
      parseErrorMessage(data, response.status),
      data
    );
  }

  if (skipUnwrap) {
    return data as T;
  }
  const result = unwrapResponse<T>(data);
  debugLog("[API_CLIENT] apiClient - RETURNING result type:", typeof result, "has accessToken:", (result as any)?.accessToken ? "yes" : "no");
  return result;
}

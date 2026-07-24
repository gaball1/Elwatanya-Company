import { API_BASE_URL } from "./env";
import { attachAuthHeader, refreshAccessToken } from "./authInterceptor";

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeout?: number;
  skipAuth?: boolean;
  skipAuthRetry?: boolean;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function parseErrorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string" && message.length > 0) return message;
  }
  return `Request failed with status ${status}`;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
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

  try {
    return await fetch(url, {
      ...rest,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(408, "Request timed out");
    }
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
  const { skipAuth = false, skipAuthRetry = false, ...requestOptions } =
    options;

  const headers = skipAuth
    ? requestOptions.headers
    : attachAuthHeader(requestOptions.headers);

  let response = await executeRequest(url, {
    ...requestOptions,
    headers,
  });

  if (
    response.status === 401 &&
    !skipAuth &&
    !skipAuthRetry &&
    !path.includes("/auth/refresh")
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await executeRequest(url, {
        ...requestOptions,
        headers: attachAuthHeader(requestOptions.headers),
      });
    }
  }

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      parseErrorMessage(data, response.status),
      data
    );
  }

  return data as T;
}

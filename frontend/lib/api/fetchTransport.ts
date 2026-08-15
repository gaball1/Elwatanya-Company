const NATIVE_CODE_RE = /\[native code\]/;

function isNativeImplementation(fn: unknown): boolean {
  if (typeof fn !== "function") return false;
  try {
    return NATIVE_CODE_RE.test(Function.prototype.toString.call(fn));
  } catch {
    return false;
  }
}

function xhrFetch(url: string, options: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method ?? "GET", url, true);
    const headers = new Headers(options.headers);
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    xhr.responseType = "text";
    xhr.onload = () => {
      const status = xhr.status;
      const statusText = xhr.statusText;
      // 204/205/304 are null-body statuses: Response must not be given a body.
      if (status === 204 || status === 205 || status === 304) {
        resolve(new Response(null, { status, statusText }));
      } else {
        resolve(new Response(xhr.responseText ?? "", { status, statusText }));
      }
    };
    xhr.onerror = () => reject(new TypeError("Failed to fetch"));
    xhr.onabort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
    xhr.ontimeout = () => reject(new DOMException("The operation timed out.", "TimeoutError"));

    if (options.signal) {
      const signal = options.signal;
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(options.body == null ? undefined : (options.body as XMLHttpRequestBodyInit));
  });
}

export async function safeFetch(url: string | URL, options: RequestInit = {}): Promise<Response> {
  if (isNativeImplementation(fetch)) {
    return fetch(url, options);
  }
  return xhrFetch(String(url), options);
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException) {
    return error.name === "AbortError" || error.name === "TimeoutError";
  }
  return false;
}
// web/ui/src/services/http.ts

/* Lightweight HTTP client with token auth, JSON helpers, retry-on-401, and typed responses. */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

/* ───────────────────────────────── helpers ───────────────────────────────── */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type Query = Record<
  string,
  string | number | boolean | null | undefined
>;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface HttpOptions<TBody = unknown> {
  query?: Query;
  headers?: Record<string, string>;
  body?: TBody;
  noAuth?: boolean; // set true to skip Authorization header
  signal?: AbortSignal;
  timeoutMs?: number; // optional timeout guard
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    public payload?: unknown
  ) {
    super(`HTTP ${status} ${statusText} – ${url}`);
    this.name = "ApiError";
  }
}

const buildUrl = (path: string, query?: Query) => {
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
};

export const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

export const setAccessToken = (token: string) => {
  if (typeof window !== "undefined") localStorage.setItem("accessToken", token);
};

export const removeAccessToken = () => {
  if (typeof window !== "undefined") localStorage.removeItem("accessToken");
};

export const getRefreshToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;

export const setRefreshToken = (token: string) => {
  if (typeof window !== "undefined")
    localStorage.setItem("refreshToken", token);
};

export const removeRefreshToken = () => {
  if (typeof window !== "undefined") localStorage.removeItem("refreshToken");
};

const baseHeaders = (): Record<string, string> => ({
  Accept: "application/json",
});

const withAuth = (headers: Record<string, string>, noAuth?: boolean) => {
  if (noAuth) return headers;
  const token = getAccessToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

const isJsonContent = (headers: Record<string, string>) =>
  Object.entries(headers).some(
    ([k, v]) =>
      k.toLowerCase() === "content-type" && v.includes("application/json")
  );

const safeJson = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const abortable = (timeoutMs?: number) => {
  if (!timeoutMs) return undefined;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  return { signal: ctrl.signal, finalize: () => clearTimeout(id) };
};

async function refreshAccessTokenOnce(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...baseHeaders() },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken?: string };
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/* ───────────────────────────────── core request ───────────────────────────────── */

async function request<TResp = unknown, TBody = unknown>(
  method: HttpMethod,
  path: string,
  opts: HttpOptions<TBody> = {}
): Promise<TResp> {
  const url = buildUrl(path, opts.query);
  const headers: Record<string, string> = withAuth(
    { ...baseHeaders(), ...(opts.headers || {}) },
    opts.noAuth
  );

  const init: RequestInit = { method, headers };

  // Body handling
  if (opts.body instanceof FormData) {
    // Let browser set multipart boundary; do not set Content-Type
    delete headers["Content-Type"];
    init.body = opts.body;
  } else if (
    opts.body !== undefined &&
    opts.body !== null &&
    !(opts.body instanceof Blob)
  ) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    if (isJsonContent(headers)) init.body = JSON.stringify(opts.body);
  } else if (opts.body instanceof Blob) {
    // For raw uploads (e.g., application/octet-stream)
    if (!headers["Content-Type"])
      headers["Content-Type"] = opts.body.type || "application/octet-stream";
    init.body = opts.body;
  }

  // Timeout support
  const abort = abortable(opts.timeoutMs);
  if (abort?.signal) init.signal = abort.signal;

  try {
    let res = await fetch(url, init);

    // Auto-refresh flow on 401 once
    if (res.status === 401 && !opts.noAuth && getRefreshToken()) {
      const refreshed = await refreshAccessTokenOnce();
      if (refreshed) {
        const retryHeaders = withAuth(
          { ...baseHeaders(), ...(opts.headers || {}) },
          opts.noAuth
        );
        const retryInit: RequestInit = { ...init, headers: retryHeaders };
        res = await fetch(url, retryInit);
      }
    }

    if (!res.ok) {
      const payload = await safeJson(res);
      throw new ApiError(res.status, res.statusText, url, payload);
    }

    // No Content
    if (res.status === 204) return undefined as unknown as TResp;

    // Try to parse JSON; fallback to text/blob if needed
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as TResp;
    }
    if (contentType.startsWith("text/")) {
      return (await res.text()) as unknown as TResp;
    }
    return (await res.blob()) as unknown as TResp;
  } finally {
    abort?.finalize?.();
  }
}

/* ───────────────────────────────── public API ───────────────────────────────── */

export function apiGet<T>(path: string, opts?: HttpOptions<void>) {
  return request<T, void>("GET", path, opts);
}

export function apiPost<T, B = Json | FormData | Blob>(
  path: string,
  body?: B,
  opts?: Omit<HttpOptions<B>, "body">
) {
  return request<T, B>("POST", path, { ...(opts as HttpOptions<B>), body });
}

export function apiPut<T, B = Json | FormData | Blob>(
  path: string,
  body?: B,
  opts?: Omit<HttpOptions<B>, "body">
) {
  return request<T, B>("PUT", path, { ...(opts as HttpOptions<B>), body });
}

export function apiPatch<T, B = Json | FormData | Blob>(
  path: string,
  body?: B,
  opts?: Omit<HttpOptions<B>, "body">
) {
  return request<T, B>("PATCH", path, { ...(opts as HttpOptions<B>), body });
}

export function apiDelete<T = void>(path: string, opts?: HttpOptions<void>) {
  return request<T, void>("DELETE", path, opts);
}

/* ───────────────────────────── convenience wrappers ─────────────────────────── */

export function downloadBlob(path: string, query?: Query) {
  return request<Blob, void>("GET", path, {
    query,
    headers: { Accept: "*/*" },
  });
}

export function uploadForm<T>(
  path: string,
  form: FormData,
  opts?: Omit<HttpOptions<FormData>, "body">
) {
  return request<T, FormData>("POST", path, {
    ...(opts as HttpOptions<FormData>),
    body: form,
  });
}

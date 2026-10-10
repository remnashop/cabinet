import type { ParseKeys } from "i18next";

import { clearTokens, getAccessToken, getRefreshToken, setTokens, type Tokens } from "@shared/api/tokens";
import { getApiUrl } from "@shared/config";
import i18n from "@shared/i18n";

export class ApiError extends Error {
  status: number;
  // ErrorCode from the backend; translated under apiErrors.*
  code: string | null;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// The backend itself is unreachable: fetch failed, or a proxy answered 502/503/504 for it.
export class NetworkError extends Error {}

// ok: new tokens saved. rejected: the refresh token is dead, the session is over.
// unavailable: no answer (offline, 5xx, 429); the session may be fine, keep it.
export type RefreshResult = "ok" | "rejected" | "unavailable";

const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504]);

let refreshPromise: Promise<RefreshResult> | null = null;
let onSessionEnd: () => void = () => {};

export function setSessionEndHandler(handler: () => void): void {
  onSessionEnd = handler;
}

async function attemptRefresh(): Promise<RefreshResult> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return "rejected";

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}/cabinet/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    return "unavailable";
  }
  if (response.status >= 500 || response.status === 429) return "unavailable";
  if (!response.ok) {
    clearTokens();
    return "rejected";
  }
  try {
    setTokens((await response.json()) as Tokens);
    return "ok";
  } catch {
    return "unavailable";
  }
}

// Another tab shares the refresh token in localStorage; the lock queues it behind
// this one, and attemptRefresh then reads the already-rotated token.
function lockedRefresh(): Promise<RefreshResult> {
  return navigator.locks ? navigator.locks.request("cabinet-refresh", attemptRefresh) : attemptRefresh();
}

/** One refresh at a time: a rotated refresh token reused by a second caller would read as theft. */
export function refreshSession(): Promise<RefreshResult> {
  refreshPromise ??= lockedRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function send(path: string, init: RequestInit | undefined, token: string | null): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    return await fetch(`${getApiUrl()}${path}`, { ...init, headers });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new NetworkError("Network request failed");
  }
}

function endSession(): void {
  clearTokens();
  onSessionEnd();
}

async function authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const response = await send(path, init, token);
  if (response.status !== 401 || !token) return response;

  // another request may already have refreshed while this one was in flight
  if (getAccessToken() === token) {
    const refreshed = await refreshSession();
    if (refreshed === "unavailable") throw new NetworkError("Session refresh failed");
    if (refreshed === "rejected") {
      endSession();
      return response;
    }
  }
  const retry = await send(path, init, getAccessToken());
  if (retry.status === 401) endSession();
  return retry;
}

function extractErrorCode(body: unknown): string | null {
  if (body && typeof body === "object" && "code" in body && typeof body.code === "string") return body.code;
  return null;
}

function extractErrorMessage(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = body.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : String(item)))
        .join("; ");
    }
  }
  return "Request failed";
}

function errorFor(response: Response, body: unknown): Error {
  if (GATEWAY_ERROR_STATUSES.has(response.status) && extractErrorCode(body) === null) {
    return new NetworkError("Backend unreachable");
  }
  return new ApiError(response.status, extractErrorMessage(body), extractErrorCode(body));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authorizedFetch(path, init);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw errorFor(response, body);
  return body as T;
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { signal });
}

export function apiPost<T, B>(path: string, body: B, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof NetworkError) return i18n.t("errors.network");
  if (!(err instanceof ApiError)) return fallback;
  const key = `apiErrors.${err.code}`;
  return err.code && i18n.exists(key) ? i18n.t(key as ParseKeys) : err.message;
}

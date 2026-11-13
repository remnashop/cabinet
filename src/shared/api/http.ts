import type { ParseKeys } from "i18next";

import { markServiceClosed } from "@shared/api/maintenance";
import { clearAccessToken, getAccessToken, setAccessToken, type AccessToken } from "@shared/api/tokens";
import i18n from "@shared/i18n";
import { formatWait } from "@shared/lib/format";

// nginx in the cabinet image proxies this to the backend's /api/v1
export const API_BASE = "/api";
const CSRF_COOKIE = "cabinet_csrf_token";

export class ApiError extends Error {
  status: number;
  // ErrorCode from the backend; translated under apiErrors.*
  code: string | null;
  // COOLDOWN_ACTIVE: when the action is allowed again (ISO)
  availableAt: string | null;

  constructor(status: number, message: string, code: string | null = null, availableAt: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.availableAt = availableAt;
  }
}

// The backend itself is unreachable: fetch failed, or a proxy answered 502/503/504 for it.
export class NetworkError extends Error {}

// ok: a new access token is in memory. rejected: the session is over.
// unavailable: no answer (offline, 5xx, 429); the session may be fine, keep it.
export type RefreshResult = "ok" | "rejected" | "unavailable";

const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504]);

let refreshPromise: Promise<RefreshResult> | null = null;
let onSessionEnd: () => void = () => {};

export function setSessionEndHandler(handler: () => void): void {
  onSessionEnd = handler;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function withCsrf(headers: Headers): Headers {
  const token = readCookie(CSRF_COOKIE);
  if (token) headers.set("X-Csrf-Token", token);
  return headers;
}

/** A failed sign-in call mapped onto the session outcome it implies. */
export function classifyAuthError(err: unknown): RefreshResult {
  if (err instanceof NetworkError) return "unavailable";
  if (err instanceof ApiError && (err.status >= 500 || err.status === 429)) return "unavailable";
  return "rejected";
}

export async function cookieRefresh(): Promise<RefreshResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", headers: withCsrf(new Headers()) });
  } catch {
    return "unavailable";
  }
  if (response.status >= 500 || response.status === 429) return "unavailable";
  if (!response.ok) {
    clearAccessToken();
    return "rejected";
  }
  // a 2xx without a token didn't come from our backend (a proxy page, a SPA fallback): treat the
  // in-memory session as lost; a reload gets a new token from the cookie if it still works
  const body = (await response.json().catch(() => null)) as Partial<AccessToken> | null;
  if (typeof body?.access_token !== "string") {
    clearAccessToken();
    return "rejected";
  }
  setAccessToken(body as AccessToken);
  return "ok";
}

let reauthenticate: () => Promise<RefreshResult> = cookieRefresh;

/** The Mini App swaps the cookie refresh for a fresh initData sign-in. */
export function setReauthenticator(fn: () => Promise<RefreshResult>): void {
  reauthenticate = fn;
}

// tabs share the refresh cookie; the lock keeps one rotation in flight
function lockedRefresh(): Promise<RefreshResult> {
  return navigator.locks ? navigator.locks.request("cabinet-refresh", () => reauthenticate()) : reauthenticate();
}

/** One refresh at a time: a rotated refresh token reused by a second caller would read as theft. */
export function refreshSession(): Promise<RefreshResult> {
  refreshPromise ??= lockedRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function send(path: string, init: RequestInit | undefined, token: string | null): Promise<Response> {
  const headers = withCsrf(new Headers(init?.headers));
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    return await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new NetworkError("Network request failed");
  }
}

function endSession(): void {
  clearAccessToken(true);
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
  const code = extractErrorCode(body);
  if (code === "ACCESS_RESTRICTED") markServiceClosed();
  const availableAt =
    body && typeof body === "object" && "available_at" in body && typeof body.available_at === "string"
      ? body.available_at
      : null;
  return new ApiError(response.status, extractErrorMessage(body), code, availableAt);
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

/** keepalive: the request outlives the page, for one fired right before a reload or close. */
export function apiPost<T, B>(path: string, body: B, signal?: AbortSignal, keepalive = false): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
    keepalive,
  });
}

export function apiPatch<T, B>(path: string, body: B): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function apiDelete(path: string): Promise<void> {
  return request<void>(path, { method: "DELETE" });
}

/** cooldownKey: the action's own "you can … again in {{wait}}", as the bot says it, for a COOLDOWN_ACTIVE answer */
export function getErrorMessage(err: unknown, fallback: string, cooldownKey?: ParseKeys): string {
  // no answer: the device being offline is the likelier reason, and the one the user can fix
  if (err instanceof NetworkError) return i18n.t(navigator.onLine ? "errors.network" : "errors.offline");
  if (!(err instanceof ApiError)) return fallback;
  if (err.code === "COOLDOWN_ACTIVE" && err.availableAt && cooldownKey) {
    return i18n.t(cooldownKey, { wait: formatWait(err.availableAt, i18n.language) });
  }
  const key = `apiErrors.${err.code}`;
  // the backend's own message is English and not for users: a code without a translation reads as the fallback
  return err.code && i18n.exists(key) ? i18n.t(key as ParseKeys) : fallback;
}

import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { apiGet, apiPost, cookieRefresh, NetworkError, setReauthenticator, setSessionEndHandler } from "@shared/api/http";
import { isServiceClosed } from "@shared/api/maintenance";
import { clearAccessToken, getAccessToken, setAccessToken, wasSessionExpired } from "@shared/api/tokens";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const token = (n: number) => ({ access_token: `a${n}`, expires_in: 900 });
const bearer = (init: RequestInit | undefined) => new Headers(init?.headers).get("Authorization");
const csrf = (init: RequestInit | undefined) => new Headers(init?.headers).get("X-Csrf-Token");
const isRefresh = (url: string) => url === "/api/auth/refresh";

function mockFetch(handler: (url: string, init: RequestInit | undefined) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  document.cookie = "cabinet_csrf_token=csrf-1; path=/";
  clearAccessToken();
  setAccessToken(token(1));
});

afterEach(() => {
  vi.unstubAllGlobals();
  setSessionEndHandler(() => {});
  setReauthenticator(cookieRefresh);
  document.cookie = "cabinet_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

it("calls the same-origin /api base with a bearer token", async () => {
  const fetch = mockFetch(() => json(200, { ok: true }));
  await expect(apiGet("/me")).resolves.toEqual({ ok: true });
  expect(fetch.mock.calls[0][0]).toBe("/api/me");
  expect(bearer(fetch.mock.calls[0][1])).toBe("Bearer a1");
});

it("refreshes through the cookie with the csrf header and no body", async () => {
  const fetch = mockFetch((url, init) => {
    if (isRefresh(url)) return json(200, token(2));
    return bearer(init) === "Bearer a2" ? json(200, { ok: true }) : json(401, { detail: "expired" });
  });
  await expect(apiGet("/me")).resolves.toEqual({ ok: true });
  const refreshCall = fetch.mock.calls.find(([url]) => isRefresh(String(url)))!;
  expect(refreshCall[1]!.body).toBeUndefined();
  expect(csrf(refreshCall[1])).toBe("csrf-1");
  expect(getAccessToken()).toBe("a2");
});

it("shares one refresh between concurrent 401s", async () => {
  const fetch = mockFetch((url, init) => {
    if (isRefresh(url)) return new Promise((resolve) => setTimeout(() => resolve(json(200, token(2))), 10));
    return bearer(init) === "Bearer a2" ? json(200, { ok: true }) : json(401, { detail: "expired" });
  });
  await Promise.all([apiGet("/me"), apiGet("/me"), apiGet("/me")]);
  expect(fetch.mock.calls.filter(([url]) => isRefresh(String(url)))).toHaveLength(1);
});

it("ends the session when the refresh is rejected", async () => {
  const onEnd = vi.fn();
  setSessionEndHandler(onEnd);
  mockFetch((url) => (isRefresh(url) ? json(401, { detail: "revoked" }) : json(401, { detail: "expired" })));
  await expect(apiGet("/me")).rejects.toMatchObject({ status: 401 });
  expect(onEnd).toHaveBeenCalledOnce();
  expect(getAccessToken()).toBeNull();
  expect(wasSessionExpired()).toBe(true);
  clearAccessToken();
  expect(wasSessionExpired()).toBe(false);
});

it("keeps the session when the refresh is unavailable", async () => {
  mockFetch((url) => (isRefresh(url) ? json(503, {}) : json(401, { detail: "expired" })));
  await expect(apiGet("/me")).rejects.toBeInstanceOf(NetworkError);
  expect(getAccessToken()).toBe("a1");
});

it("treats a refresh that answered 2xx without a token as a rejected session", async () => {
  // the backend already rotated the cookie; keeping the old session would replay a dead token
  mockFetch(() => new Response("<html>proxy page</html>", { status: 200 }));
  await expect(cookieRefresh()).resolves.toBe("rejected");
  expect(getAccessToken()).toBeNull();
});

it("uses the installed reauthenticator instead of the cookie refresh", async () => {
  setReauthenticator(async () => {
    setAccessToken(token(9));
    return "ok";
  });
  const fetch = mockFetch((_url, init) => (bearer(init) === "Bearer a9" ? json(200, { ok: true }) : json(401, {})));
  await expect(apiGet("/me")).resolves.toEqual({ ok: true });
  expect(fetch.mock.calls.some(([url]) => isRefresh(String(url)))).toBe(false);
});

it("sends the csrf header on posts", async () => {
  const fetch = mockFetch(() => new Response(null, { status: 204 }));
  await apiPost("/auth/logout", {});
  expect(csrf(fetch.mock.calls[0][1])).toBe("csrf-1");
});

it("translates a known error code and falls back on an unknown one", async () => {
  const { ApiError, getErrorMessage } = await import("@shared/api/http");
  const { default: i18n } = await import("@shared/i18n");
  expect(getErrorMessage(new ApiError(400, "raw", "PROMOCODE_EXPIRED"), "fallback")).toBe(i18n.t("apiErrors.PROMOCODE_EXPIRED"));
  expect(getErrorMessage(new ApiError(400, "raw", "SOME_NEW_CODE"), "fallback")).toBe("fallback");
  expect(getErrorMessage(new ApiError(500, "raw"), "fallback")).toBe("fallback");
});

it("tells an offline device from an unreachable server", async () => {
  const { getErrorMessage } = await import("@shared/api/http");
  const { default: i18n } = await import("@shared/i18n");
  const online = vi.spyOn(navigator, "onLine", "get");
  online.mockReturnValue(false);
  expect(getErrorMessage(new NetworkError("x"), "fallback")).toBe(i18n.t("errors.offline"));
  online.mockReturnValue(true);
  expect(getErrorMessage(new NetworkError("x"), "fallback")).toBe(i18n.t("errors.network"));
  online.mockRestore();
});

it("closes the cabinet when the backend answers ACCESS_RESTRICTED", async () => {
  expect(isServiceClosed()).toBe(false);
  mockFetch(() => json(403, { detail: "closed", code: "ACCESS_RESTRICTED" }));
  await expect(apiGet("/subscriptions/me")).rejects.toMatchObject({ code: "ACCESS_RESTRICTED" });
  expect(isServiceClosed()).toBe(true);
});

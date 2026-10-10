import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError, apiGet, NetworkError, refreshSession, setSessionEndHandler } from "@shared/api/http";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@shared/api/tokens";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const tokens = (n: number) => ({ access_token: `a${n}`, refresh_token: `r${n}`, expires_in: 900 });
const bearer = (init: RequestInit | undefined) => new Headers(init?.headers).get("Authorization");
const isRefresh = (url: string) => url.endsWith("/cabinet/auth/refresh");

function mockFetch(handler: (url: string, init: RequestInit | undefined) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  clearTokens();
  setTokens(tokens(1));
});

afterEach(() => {
  vi.unstubAllGlobals();
  setSessionEndHandler(() => {});
});

it("sends the access token as a bearer header", async () => {
  const fetch = mockFetch(() => json(200, { ok: true }));
  await expect(apiGet("/cabinet/me")).resolves.toEqual({ ok: true });
  expect(fetch.mock.calls[0][0]).toBe("/api/v1/cabinet/me");
  expect(bearer(fetch.mock.calls[0][1])).toBe("Bearer a1");
});

it("refreshes on 401 and retries with the new token", async () => {
  const fetch = mockFetch((url, init) => {
    if (isRefresh(url)) return json(200, tokens(2));
    return bearer(init) === "Bearer a2" ? json(200, { ok: true }) : json(401, { detail: "expired" });
  });
  await expect(apiGet("/cabinet/me")).resolves.toEqual({ ok: true });
  expect(getAccessToken()).toBe("a2");
  expect(getRefreshToken()).toBe("r2");
  const refreshCall = fetch.mock.calls.find(([url]) => isRefresh(String(url)))!;
  expect(JSON.parse(String(refreshCall[1]!.body))).toEqual({ refresh_token: "r1" });
});

it("shares one refresh between concurrent 401s", async () => {
  const fetch = mockFetch((url, init) => {
    if (isRefresh(url)) return new Promise((resolve) => setTimeout(() => resolve(json(200, tokens(2))), 10));
    return bearer(init) === "Bearer a2" ? json(200, { ok: true }) : json(401, { detail: "expired" });
  });
  await Promise.all([apiGet("/cabinet/me"), apiGet("/cabinet/me"), apiGet("/cabinet/me")]);
  expect(fetch.mock.calls.filter(([url]) => isRefresh(String(url)))).toHaveLength(1);
});

it("ends the session when the refresh is rejected", async () => {
  const onEnd = vi.fn();
  setSessionEndHandler(onEnd);
  mockFetch((url) => (isRefresh(url) ? json(401, { detail: "revoked" }) : json(401, { detail: "expired" })));
  await expect(apiGet("/cabinet/me")).rejects.toMatchObject({ status: 401 });
  expect(onEnd).toHaveBeenCalled();
  expect(getAccessToken()).toBeNull();
  expect(getRefreshToken()).toBeNull();
});

it("keeps the session when the backend is unavailable during refresh", async () => {
  const onEnd = vi.fn();
  setSessionEndHandler(onEnd);
  mockFetch((url) => (isRefresh(url) ? json(503, {}) : json(401, { detail: "expired" })));
  await expect(apiGet("/cabinet/me")).rejects.toBeInstanceOf(NetworkError);
  expect(onEnd).not.toHaveBeenCalled();
  expect(getRefreshToken()).toBe("r1");
});

it("maps an error body to ApiError with its code", async () => {
  mockFetch(() => json(400, { detail: "Wrong code", code: "EMAIL_CODE_INVALID" }));
  const err = await apiGet("/x").catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status: 400, code: "EMAIL_CODE_INVALID", message: "Wrong code" });
});

it("treats a proxy 502 without a code and a failed fetch as NetworkError", async () => {
  mockFetch(() => new Response("Bad Gateway", { status: 502 }));
  await expect(apiGet("/x")).rejects.toBeInstanceOf(NetworkError);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  await expect(apiGet("/x")).rejects.toBeInstanceOf(NetworkError);
});

it("reports rejected without a request when there is no refresh token", async () => {
  clearTokens();
  const fetch = mockFetch(() => json(200, tokens(2)));
  await expect(refreshSession()).resolves.toBe("rejected");
  expect(fetch).not.toHaveBeenCalled();
});

it("refreshes under a cross-tab lock so two tabs don't rotate the same token", async () => {
  const lockNames: string[] = [];
  vi.stubGlobal("navigator", {
    ...navigator,
    locks: { request: (name: string, fn: () => Promise<unknown>) => (lockNames.push(name), fn()) },
  });
  mockFetch(() => json(200, tokens(2)));
  await expect(refreshSession()).resolves.toBe("ok");
  expect(lockNames).toEqual(["cabinet-refresh"]);
});

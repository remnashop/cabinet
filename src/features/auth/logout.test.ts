import { afterEach, expect, it, vi } from "vitest";

import { logout } from "@features/auth/logout";
import { getAccessToken, setAccessToken } from "@shared/api/tokens";

afterEach(() => vi.unstubAllGlobals());

it("keeps the session until the server revoked the refresh cookie, and survives a page unload", async () => {
  setAccessToken({ access_token: "a1", expires_in: 900 });
  let respond: (response: Response) => void = () => {};
  const fetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => new Promise<Response>((resolve) => (respond = resolve)));
  vi.stubGlobal("fetch", fetch);

  const done = logout();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
  // signed out on screen before the revoke lands, a reload would sign straight back in
  expect(getAccessToken()).toBe("a1");
  expect(fetch.mock.calls[0][1]).toMatchObject({ keepalive: true });

  respond(new Response(null, { status: 204 }));
  await done;
  expect(getAccessToken()).toBeNull();
});

it("still signs out locally when the server can't be reached", async () => {
  setAccessToken({ access_token: "a1", expires_in: 900 });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  await logout();
  expect(getAccessToken()).toBeNull();
});

import { afterEach, expect, it, vi } from "vitest";

import { bootSession } from "@features/auth/boot";
import { apiGet, cookieRefresh, setReauthenticator } from "@shared/api/http";
import { getAccessToken } from "@shared/api/tokens";

// vitest hoists this above the imports
vi.mock("@shared/telegram", () => ({ getInitDataRaw: () => "signed-init-data" }));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  setReauthenticator(cookieRefresh);
});

it("signs in by initData and re-signs in on 401 instead of refreshing", async () => {
  let logins = 0;
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/auth/telegram") {
      logins += 1;
      expect(JSON.parse(String(init!.body))).toEqual({ init_data: "signed-init-data" });
      return json(200, { access_token: `a${logins}`, expires_in: 900 });
    }
    const auth = new Headers(init?.headers).get("Authorization");
    return auth === "Bearer a2" ? json(200, { id: 1 }) : json(401, {});
  });
  vi.stubGlobal("fetch", fetch);

  await expect(bootSession()).resolves.toEqual({ kind: "authed" });
  await expect(apiGet("/me")).resolves.toEqual({ id: 1 });
  expect(logins).toBe(2);
  expect(getAccessToken()).toBe("a2");
  expect(fetch.mock.calls.some(([url]) => String(url) === "/api/auth/refresh")).toBe(false);
});

import { expect, it } from "vitest";

import { parseOAuthCallback } from "@shared/lib/oauth-callback";

it("returns code and state", () => {
  expect(parseOAuthCallback("?code=c1&state=s1", "s1")).toEqual({ ok: true, code: "c1", state: "s1" });
});

it("fails on a provider error or missing params", () => {
  expect(parseOAuthCallback("?error=access_denied&state=s1", "s1")).toEqual({ ok: false });
  expect(parseOAuthCallback("?code=c1", "s1")).toEqual({ ok: false });
  expect(parseOAuthCallback("", "s1")).toEqual({ ok: false });
});

it("rejects a state this browser didn't start (login CSRF)", () => {
  expect(parseOAuthCallback("?code=c1&state=attacker", "s1")).toEqual({ ok: false });
  expect(parseOAuthCallback("?code=c1&state=s1", null)).toEqual({ ok: false });
});

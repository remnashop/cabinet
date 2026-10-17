import { beforeEach, expect, it } from "vitest";

import { clearOAuthLink, markOAuthLink, takeOAuthLink } from "@shared/lib/oauth-link-marker";

const MINUTE = 60_000;

beforeEach(() => sessionStorage.clear());

it("is taken once for the marked provider", () => {
  markOAuthLink("google");
  expect(takeOAuthLink("google")).toBe(true);
  expect(takeOAuthLink("google")).toBe(false);
});

it("is erased by a callback for another provider", () => {
  markOAuthLink("google");
  expect(takeOAuthLink("yandex")).toBe(false);
  expect(takeOAuthLink("google")).toBe(false);
});

it("expires after 15 minutes", () => {
  markOAuthLink("google");
  expect(takeOAuthLink("google", Date.now() + 15 * MINUTE)).toBe(false);
  markOAuthLink("google");
  expect(takeOAuthLink("google", Date.now() + 14 * MINUTE)).toBe(true);
});

it("is dropped when a normal sign-in starts", () => {
  markOAuthLink("google");
  clearOAuthLink();
  expect(takeOAuthLink("google")).toBe(false);
});

it("ignores a damaged marker", () => {
  sessionStorage.setItem("cabinet_oauth_link", "{broken");
  expect(takeOAuthLink("google")).toBe(false);
});

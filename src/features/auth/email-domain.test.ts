import { expect, it } from "vitest";

import { isUnlistedDomain } from "./email-domain";

const allowed = ["gmail.com", "mail.ru"];

it("flags a complete domain outside the list", () => {
  expect(isUnlistedDomain("bot@mailinator.com", allowed)).toBe(true);
  expect(isUnlistedDomain("a@x.gmail.com", allowed)).toBe(true);
});

it("passes listed domains regardless of case and spaces", () => {
  expect(isUnlistedDomain("  Ivan@GMAIL.com ", allowed)).toBe(false);
});

it("stays quiet while the domain is still being typed", () => {
  expect(isUnlistedDomain("ivan", allowed)).toBe(false);
  expect(isUnlistedDomain("ivan@gma", allowed)).toBe(false);
});

it("never flags when any domain is allowed", () => {
  expect(isUnlistedDomain("bot@mailinator.com", null)).toBe(false);
});

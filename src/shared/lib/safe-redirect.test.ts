import { describe, expect, it } from "vitest";

import { isHttpsUrl, safeNext, telegramLink } from "@shared/lib/safe-redirect";

it("keeps same-origin paths", () => {
  expect(safeNext("/profile/payments?x=1")).toBe("/profile/payments?x=1");
});

it("rejects anything that could leave the origin", () => {
  for (const next of [null, "", "profile", "//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/\t/evil.com", "/\n/evil.com"]) {
    expect(safeNext(next)).toBe("/");
  }
});

describe("isHttpsUrl", () => {
  it("lets only https leave", () => {
    expect(isHttpsUrl("https://sub.example.com/abc")).toBe(true);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpsUrl("http://evil.example")).toBe(false);
    expect(isHttpsUrl("not a url")).toBe(false);
  });
});

describe("telegramLink", () => {
  it("keeps only t.me links", () => {
    expect(telegramLink("https://t.me/shop_bot?start=webauth_x")).toBe("https://t.me/shop_bot?start=webauth_x");
    expect(telegramLink("https://t.me.evil.example/x")).toBeUndefined();
    expect(telegramLink("javascript:alert(1)")).toBeUndefined();
  });
});

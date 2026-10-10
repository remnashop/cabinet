import { expect, it } from "vitest";

import { safeNext } from "@shared/lib/safe-redirect";

it("keeps same-origin paths", () => {
  expect(safeNext("/profile/payments?x=1")).toBe("/profile/payments?x=1");
});

it("rejects anything that could leave the origin", () => {
  for (const next of [null, "", "profile", "//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/\t/evil.com", "/\n/evil.com"]) {
    expect(safeNext(next)).toBe("/");
  }
});

import { afterEach, expect, it } from "vitest";

import { getApiUrl } from "@shared/config";

afterEach(() => {
  delete window.__CONFIG__;
});

it("defaults to /api/v1", () => {
  expect(getApiUrl()).toBe("/api/v1");
});

it("uses the runtime config without a trailing slash", () => {
  window.__CONFIG__ = { apiUrl: "https://api.example.com/api/v1/" };
  expect(getApiUrl()).toBe("https://api.example.com/api/v1");
});

it("falls back to the default for a blank value", () => {
  window.__CONFIG__ = { apiUrl: "  " };
  expect(getApiUrl()).toBe("/api/v1");
});

import { beforeEach, expect, it } from "vitest";

import { captureAttribution, clearAttribution, parseAttribution, readAttribution } from "@shared/lib/attribution";

beforeEach(() => clearAttribution());

it("reads ref and ad from the query string", () => {
  expect(parseAttribution("?ref=abc&ad=x_1", null)).toEqual({ ref: "abc", ad: "x_1" });
});

it("reads a Telegram start_param", () => {
  expect(parseAttribution("", "ref_abc_def")).toEqual({ ref: "abc_def" });
  expect(parseAttribution("", "ad_promo-1")).toEqual({ ad: "promo-1" });
});

it("ignores malformed codes", () => {
  expect(parseAttribution("?ref=<script>", "foo_bar")).toEqual({});
  expect(parseAttribution(`?ref=${"a".repeat(65)}`, "ref_")).toEqual({});
});

it("keeps the first attribution", () => {
  captureAttribution("?ref=first", null);
  captureAttribution("?ref=second", null);
  expect(readAttribution()).toEqual({ ref: "first" });
});

it("stores nothing without codes and survives corrupt storage", () => {
  captureAttribution("", null);
  expect(readAttribution()).toEqual({});
  localStorage.setItem("cabinet_attribution", "{not json");
  expect(readAttribution()).toEqual({});
});

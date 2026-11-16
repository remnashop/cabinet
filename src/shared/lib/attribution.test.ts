import { beforeEach, expect, it } from "vitest";

import {
  captureAttribution,
  clearAttribution,
  parseAttribution,
  parseFirstTouch,
  readAttribution,
} from "@shared/lib/attribution";

const CABINET = "https://my.example.com";

beforeEach(() => clearAttribution());

it("reads ref and ad from the query string", () => {
  expect(parseAttribution("?ref=abc&ad=x_1", null)).toEqual({
    ref: "abc",
    ad: "x_1",
  });
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
  captureAttribution(`${CABINET}/?ref=first`, "", null);
  captureAttribution(`${CABINET}/?ref=second&utm_source=later`, "", null);
  expect(readAttribution()).toEqual({
    ref: "first",
    first_touch: { landing_url: `${CABINET}/?ref=first` },
  });
});

it("stores the first touch without codes and survives corrupt storage", () => {
  captureAttribution(`${CABINET}/plans`, "https://blog.example.org/post", null);
  expect(readAttribution()).toEqual({
    first_touch: {
      landing_url: `${CABINET}/plans`,
      referer: "https://blog.example.org/post",
    },
  });
  localStorage.setItem("cabinet_attribution", "{not json");
  expect(readAttribution()).toEqual({});
});

it("reads UTM tags and the first click id", () => {
  const touch = parseFirstTouch(
    `${CABINET}/?utm_source=vk&utm_medium=cpc&utm_campaign=spring&fbclid=f&yclid=y`,
    "",
  );
  expect(touch).toMatchObject({
    utm_source: "vk",
    utm_medium: "cpc",
    utm_campaign: "spring",
    click_id: "yclid:y",
  });
  expect(touch.utm_term).toBeUndefined();
});

it("drops the cabinet's own referrer, non-web URLs and the hash", () => {
  expect(
    parseFirstTouch(`${CABINET}/login#tgWebAppData=secret`, `${CABINET}/`),
  ).toEqual({
    landing_url: `${CABINET}/login`,
  });
  expect(
    parseFirstTouch(`${CABINET}/`, "android-app://org.telegram.messenger/"),
  ).toEqual({
    landing_url: `${CABINET}/`,
  });
  expect(parseFirstTouch("file:///index.html", "")).toEqual({});
});

it("cuts values to the backend's limits", () => {
  const touch = parseFirstTouch(
    `${CABINET}/?utm_source=${"s".repeat(200)}&gclid=${"g".repeat(300)}&x=${"x".repeat(600)}`,
    "",
  );
  expect(touch.landing_url).toHaveLength(512);
  expect(touch.utm_source).toHaveLength(128);
  expect(touch.click_id).toHaveLength(256);
});

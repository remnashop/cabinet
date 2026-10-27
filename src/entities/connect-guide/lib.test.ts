import { describe, expect, it } from "vitest";

import type { ConnectGuide } from "./api";
import { buildDeepLink, catalogBuilds, decodeHop, detectPlatform, encodeHop, linkDigest } from "./lib";

const guide: ConnectGuide = {
  platforms: [
    {
      id: "ios",
      apps: [
        {
          id: "happ",
          name: "Happ",
          featured: true,
          steps: [
            {
              title: { en: "Add" },
              body: null,
              icon: "plus",
              buttons: [
                { kind: "deep_link", label: { en: "Add" }, template: "happ://add/{{SUBSCRIPTION_LINK}}", encode: "raw" },
                {
                  kind: "deep_link",
                  label: { en: "Add" },
                  template: "clash://install-config?url={{SUBSCRIPTION_LINK}}",
                  encode: "component",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const SUB = "https://sub.example.com/abc?x=1";
const SIG = "A".repeat(43);

describe("deep links", () => {
  it("substitutes the link raw or percent-encoded", () => {
    expect(buildDeepLink("happ://add/{{SUBSCRIPTION_LINK}}", "raw", SUB)).toBe(`happ://add/${SUB}`);
    expect(buildDeepLink("clash://install-config?url={{SUBSCRIPTION_LINK}}", "component", SUB)).toBe(
      `clash://install-config?url=${encodeURIComponent(SUB)}`,
    );
  });

  it("accepts only what a catalog button builds from that https link", () => {
    const hop = (link: string, sub = SUB) => ({ link, sub, sig: SIG });
    expect(catalogBuilds(guide, hop(`happ://add/${SUB}`))).toBe(true);
    expect(catalogBuilds(guide, hop(`clash://install-config?url=${encodeURIComponent(SUB)}`))).toBe(true);
    // the link must be built from the subscription the signature is checked for, not another one
    expect(catalogBuilds(guide, hop("happ://add/https://evil.example/sub"))).toBe(false);
    expect(catalogBuilds(guide, hop("happ://add/http://evil.example", "http://evil.example"))).toBe(false);
    expect(catalogBuilds(guide, hop("javascript:alert(1)"))).toBe(false);
    expect(catalogBuilds(guide, hop(`other://add/${SUB}`))).toBe(false);
    expect(catalogBuilds({ platforms: [] }, hop(`happ://add/${SUB}`))).toBe(false);
  });

  it("round-trips the hop fragment and refuses a malformed one", () => {
    const hop = { link: `clash://install-config?url=${encodeURIComponent(SUB)}`, sub: SUB, sig: SIG };
    expect(decodeHop(encodeHop(hop))).toEqual(hop);
    expect(encodeHop(hop)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeHop("%%%")).toBeNull();
    expect(decodeHop(encodeHop({ ...hop, sig: "short" }))).toBeNull();
  });

  it("digests the link as the backend does: SHA-256, unpadded base64url", async () => {
    expect(await linkDigest("abc")).toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
  });
});

describe("detectPlatform", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", "ios"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8)", "android"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "windows"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)", "macos"],
    ["Mozilla/5.0 (X11; Linux x86_64)", "linux"],
    ["Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)", "linux"],
    ["Mozilla/5.0 (Linux; Android 12; BRAVIA 4K UR3)", "androidtv"],
    ["Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0)", null],
    ["Mozilla/5.0 (Web0S; Linux/SmartTV)", null],
    ["curl/8", null],
  ])("%s → %s", (ua, platform) => {
    expect(detectPlatform(ua)).toBe(platform);
  });

  it("tells an iPad, which claims to be a Mac, by its touch points", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
    expect(detectPlatform(ua, 5)).toBe("ios");
    expect(detectPlatform(ua, 0)).toBe("macos");
  });
});

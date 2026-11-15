import { describe, expect, it } from "vitest";

import { resolveShaderStops } from "@shared/lib/shaderPalette";

describe("resolveShaderStops", () => {
  it("gives the default background for the default accent", () => {
    expect(resolveShaderStops(null, { base: null, tones: null })).toEqual(["#12101a", "#172028", "#142030", "#0f1023"]);
    expect(resolveShaderStops("#22d3ee", { base: null, tones: null })).toEqual(["#12101a", "#172028", "#142030", "#0f1023"]);
  });

  it("keeps a pinned tone and derives the rest from the base", () => {
    expect(resolveShaderStops("#ef4444", { base: "#12101a", tones: [null, "#ff0000", null] })).toEqual([
      "#12101a",
      "#172028",
      "#ff0000",
      "#0f1023",
    ]);
  });
});

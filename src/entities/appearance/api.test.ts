import { describe, expect, it } from "vitest";

import { mergeAppearance } from "@entities/appearance/api";

const EMPTY = {
  brand_name: null,
  primary_color: null,
  shader_base: null,
  shader_tones: null,
  shader_enabled: true,
  has_logo: false,
  has_favicon: false,
};

describe("mergeAppearance", () => {
  it("falls back to the dashboard for what the cabinet leaves unset", () => {
    const dashboard = { ...EMPTY, brand_name: "Acme", primary_color: "#ff0000", has_logo: true };
    const result = mergeAppearance({ ...EMPTY, shader_enabled: false }, dashboard, 1);

    expect(result.brandName).toBe("Acme");
    expect(result.primaryColor).toBe("#ff0000");
    expect(result.logoUrl).toBe("/api/appearance/dashboard/logo?v=1");
    expect(result.faviconUrl).toBeNull();
    expect(result.shaderEnabled).toBe(false);
  });

  it("prefers the cabinet's own values", () => {
    const cabinet = { ...EMPTY, brand_name: "Acme VPN", has_logo: true };
    const result = mergeAppearance(cabinet, { ...EMPTY, brand_name: "Acme", has_logo: true }, 1);

    expect(result.brandName).toBe("Acme VPN");
    expect(result.logoUrl).toBe("/api/appearance/cabinet/logo?v=1");
  });

  it("takes the shader's base and tones together from one side", () => {
    const dashboard = { ...EMPTY, shader_base: "#111111", shader_tones: ["#222222", null, null] };

    expect(mergeAppearance(EMPTY, dashboard, 1).shaderColors).toEqual({
      base: "#111111",
      tones: ["#222222", null, null],
    });
    expect(mergeAppearance({ ...EMPTY, shader_base: "#333333" }, dashboard, 1).shaderColors).toEqual({
      base: "#333333",
      tones: null,
    });
  });
});

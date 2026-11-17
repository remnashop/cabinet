import { describe, expect, it } from "vitest";

import { toAppearance } from "@entities/appearance/api";

const EMPTY = {
  brand_name: null,
  primary_color: null,
  shader_base: null,
  shader_tones: null,
  shader_enabled: true,
  has_logo: false,
  has_favicon: false,
};

describe("toAppearance", () => {
  it("leaves unset values empty for the defaults", () => {
    const result = toAppearance(EMPTY, 1);

    expect(result.brandName).toBeNull();
    expect(result.primaryColor).toBeNull();
    expect(result.logoUrl).toBeNull();
    expect(result.faviconUrl).toBeNull();
  });

  it("takes the cabinet's own values", () => {
    const settings = { ...EMPTY, brand_name: "Acme", has_logo: true, has_favicon: true, shader_enabled: false };
    const result = toAppearance(settings, 1);

    expect(result.brandName).toBe("Acme");
    expect(result.logoUrl).toBe("/api/appearance/cabinet/logo?v=1");
    expect(result.faviconUrl).toBe("/api/appearance/cabinet/favicon?v=1");
    expect(result.shaderEnabled).toBe(false);
  });
});

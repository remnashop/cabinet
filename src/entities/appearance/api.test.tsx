import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAppearanceQuery, toAppearance, type Appearance } from "@entities/appearance/api";
import { until } from "@shared/testing/until";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

describe("useAppearanceQuery", () => {
  let root: ReturnType<typeof createRoot> | undefined;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = undefined;
    vi.unstubAllGlobals();
    localStorage.removeItem("cabinet_appearance");
  });

  it("keeps the last visit's appearance when the request fails", async () => {
    localStorage.setItem("cabinet_appearance", JSON.stringify(toAppearance({ ...EMPTY, brand_name: "Acme" }, 1)));
    const fetchMock = vi.fn(async () => new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const seen: { data?: Appearance; isError: boolean } = { isError: false };
    function Probe() {
      const { data, isError } = useAppearanceQuery();
      useEffect(() => void Object.assign(seen, { data, isError }));
      return null;
    }
    root = createRoot(document.createElement("div"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => root?.render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>));
    await until(() => expect(seen.isError).toBe(true));

    expect(fetchMock).toHaveBeenCalled();
    expect(seen.data?.brandName).toBe("Acme");
  });
});

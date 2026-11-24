import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { API_BASE, apiGet } from "@shared/api/http";
import { readStorage, writeStorage } from "@shared/lib/safe-storage";
import type { ShaderColors } from "@shared/lib/shaderPalette";

interface AppearanceSettings {
  brand_name: string | null;
  primary_color: string | null;
  shader_base: string | null;
  shader_tones: (string | null)[] | null;
  shader_enabled: boolean;
  has_logo: boolean;
  has_favicon: boolean;
}

export interface Appearance {
  brandName: string | null;
  primaryColor: string | null;
  shaderColors: ShaderColors;
  shaderEnabled: boolean;
  logoUrl: string | null;
  faviconUrl: string | null;
}

function imageUrl(kind: "logo" | "favicon", updatedAt: number): string {
  return `${API_BASE}/appearance/cabinet/${kind}?v=${updatedAt}`;
}

export function toAppearance(settings: AppearanceSettings, updatedAt: number): Appearance {
  return {
    brandName: settings.brand_name,
    primaryColor: settings.primary_color,
    shaderColors: { base: settings.shader_base, tones: settings.shader_tones },
    shaderEnabled: settings.shader_enabled,
    logoUrl: settings.has_logo ? imageUrl("logo", updatedAt) : null,
    faviconUrl: settings.has_favicon ? imageUrl("favicon", updatedAt) : null,
  };
}

// the last appearance seen: a repeat visit paints the shop's colors before the request answers
const STORAGE_KEY = "cabinet_appearance";

function storedAppearance(): Appearance | undefined {
  const raw = readStorage(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Appearance;
  } catch {
    return undefined;
  }
}

export function useAppearanceQuery() {
  const query = useQuery<Appearance>({
    queryKey: ["appearance"],
    queryFn: async ({ signal }) => {
      const settings = await apiGet<AppearanceSettings>("/appearance/cabinet", signal);
      const appearance = toAppearance(settings, Date.now());
      writeStorage(STORAGE_KEY, JSON.stringify(appearance));
      return appearance;
    },
    placeholderData: storedAppearance,
    staleTime: Infinity,
  });
  // a placeholder is gone once the request fails, retries and all: the last visit's look outlasts a server outage
  const fallback = useMemo(() => (query.isError ? storedAppearance() : undefined), [query.isError]);
  return { data: query.data ?? fallback, isError: query.isError };
}

export function useBrandName(): string {
  const { t } = useTranslation();
  return useAppearanceQuery().data?.brandName ?? t("app.name");
}

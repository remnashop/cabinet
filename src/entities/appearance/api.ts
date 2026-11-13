import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { API_BASE, apiGet } from "@shared/api/http";
import { readStorage, writeStorage } from "@shared/lib/safe-storage";

type AppearanceTarget = "cabinet" | "dashboard";

interface AppearanceSettings {
  brand_name: string | null;
  primary_color: string | null;
  shader_palette: string[] | null;
  shader_enabled: boolean;
  has_logo: boolean;
  has_favicon: boolean;
}

export interface Appearance {
  brandName: string | null;
  primaryColor: string | null;
  shaderPalette: string[] | null;
  shaderEnabled: boolean;
  logoUrl: string | null;
  faviconUrl: string | null;
}

function imageUrl(target: AppearanceTarget, kind: "logo" | "favicon", updatedAt: number): string {
  return `${API_BASE}/appearance/${target}/${kind}?v=${updatedAt}`;
}

// what the cabinet leaves unset comes from the dashboard's settings
export function mergeAppearance(
  cabinet: AppearanceSettings,
  dashboard: AppearanceSettings,
  updatedAt: number,
): Appearance {
  const image = (kind: "logo" | "favicon", flag: "has_logo" | "has_favicon") => {
    if (cabinet[flag]) return imageUrl("cabinet", kind, updatedAt);
    if (dashboard[flag]) return imageUrl("dashboard", kind, updatedAt);
    return null;
  };
  return {
    brandName: cabinet.brand_name ?? dashboard.brand_name,
    primaryColor: cabinet.primary_color ?? dashboard.primary_color,
    shaderPalette: cabinet.shader_palette ?? dashboard.shader_palette,
    shaderEnabled: cabinet.shader_enabled,
    logoUrl: image("logo", "has_logo"),
    faviconUrl: image("favicon", "has_favicon"),
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
  return useQuery<Appearance>({
    queryKey: ["appearance"],
    queryFn: async ({ signal }) => {
      const [cabinet, dashboard] = await Promise.all([
        apiGet<AppearanceSettings>("/appearance/cabinet", signal),
        apiGet<AppearanceSettings>("/appearance/dashboard", signal),
      ]);
      const appearance = mergeAppearance(cabinet, dashboard, Date.now());
      writeStorage(STORAGE_KEY, JSON.stringify(appearance));
      return appearance;
    },
    placeholderData: storedAppearance,
    staleTime: Infinity,
  });
}

export function useBrandName(): string {
  const { t } = useTranslation();
  return useAppearanceQuery().data?.brandName ?? t("app.name");
}

import { useEffect } from "react";

import { useAppearanceQuery, useBrandName } from "@entities/appearance/api";
import { deriveTheme } from "@shared/lib/color";

const THEME_CSS_PROPERTIES = [
  "--color-primary",
  "--color-primary-foreground",
  "--color-primary-hover",
  "--color-accent",
  "--color-accent-foreground",
] as const;

// inline styles beat styles.css's @theme defaults, so a revert has to remove them
function applyTheme(primaryColor: string | null) {
  const root = document.documentElement.style;
  if (!primaryColor) {
    for (const property of THEME_CSS_PROPERTIES) root.removeProperty(property);
    return;
  }
  const theme = deriveTheme(primaryColor);
  root.setProperty("--color-primary", theme.primary);
  root.setProperty("--color-primary-foreground", theme.primaryForeground);
  root.setProperty("--color-primary-hover", theme.primaryHover);
  root.setProperty("--color-accent", theme.accent);
  root.setProperty("--color-accent-foreground", theme.accentForeground);
}

/** Accent colors, tab title and favicon from the admin's appearance settings. */
export function ApplyAppearance() {
  const { data } = useAppearanceQuery();
  const brandName = useBrandName();
  const primaryColor = data?.primaryColor ?? null;
  const faviconUrl = data?.faviconUrl ?? null;

  useEffect(() => {
    applyTheme(primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    document.title = brandName;
  }, [brandName]);

  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.append(link);
    }
    link.removeAttribute("type");
    link.href = faviconUrl;
  }, [faviconUrl]);

  return null;
}

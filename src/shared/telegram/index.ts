import {
  backButton,
  init,
  isTMA,
  miniApp,
  retrieveLaunchParams,
  retrieveRawInitData,
  viewport,
} from "@telegram-apps/sdk-react";
import { useEffect } from "react";

let active = false;

/** Call once before render. Outside Telegram it's a no-op and isMiniApp() stays false. */
export function initTelegram(color: `#${string}`): void {
  if (!isTMA()) return;
  init();
  active = true;

  if (backButton.mount.isAvailable()) backButton.mount();
  if (miniApp.mountSync.isAvailable()) {
    miniApp.mountSync();
    // Telegram's header and our background read as one surface
    if (miniApp.setHeaderColor.isAvailable()) miniApp.setHeaderColor(color);
    if (miniApp.setBackgroundColor.isAvailable()) miniApp.setBackgroundColor(color);
    if (miniApp.ready.isAvailable()) miniApp.ready();
  }
  if (viewport.mount.isAvailable()) {
    void viewport.mount().then(() => {
      // --tg-viewport-* vars: stable height and safe-area insets (styles.css)
      if (viewport.bindCssVars.isAvailable()) viewport.bindCssVars();
      if (viewport.expand.isAvailable()) viewport.expand();
    });
  }
}

export function isMiniApp(): boolean {
  return active;
}

export function getInitDataRaw(): string | null {
  if (!active) return null;
  try {
    return retrieveRawInitData() || null;
  } catch {
    return null;
  }
}

export function getStartParam(): string | null {
  if (!active) return null;
  try {
    return retrieveLaunchParams().tgWebAppStartParam ?? null;
  } catch {
    return null;
  }
}

/** Shows Telegram's native back button while mounted; pass null to keep it hidden. */
export function useTelegramBackButton(onBack: (() => void) | null): void {
  useEffect(() => {
    if (!active || !onBack) return;
    backButton.show();
    const off = backButton.onClick(onBack);
    return () => {
      off();
      backButton.hide();
    };
  }, [onBack]);
}

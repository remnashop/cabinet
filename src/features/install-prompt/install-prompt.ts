import { readStorage, writeStorage } from "@shared/lib/safe-storage";
import { isMiniApp } from "@shared/telegram";

// answered once per browser: the guide read or the card dismissed
const RECORD_KEY = "remnashop_cabinet_install_prompt";

export type InstallPlatform = "ios" | "android";

export function detectInstallPlatform(): InstallPlatform | null {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS Safari reports itself as a Mac
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  if (/android/i.test(ua)) return "android";
  return null;
}

function isInstalled(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** A phone's browser, not yet on the home screen, never answered; the Mini App lives in Telegram already. */
export function installPromptPlatform(): InstallPlatform | null {
  if (isMiniApp() || isInstalled() || readStorage(RECORD_KEY) !== null) return null;
  return detectInstallPlatform();
}

export function recordInstallPrompt(): void {
  writeStorage(RECORD_KEY, "answered");
}

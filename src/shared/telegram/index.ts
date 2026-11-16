import {
  backButton,
  hapticFeedback,
  init,
  invoice,
  isTMA,
  miniApp,
  openLink,
  openTelegramLink,
  retrieveLaunchParams,
  retrieveRawInitData,
  shareURL,
  swipeBehavior,
  viewport,
} from "@telegram-apps/sdk-react";
import { useEffect, useRef } from "react";

import { isHttpsUrl } from "@shared/lib/safe-redirect";

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
    if (miniApp.setBackgroundColor.isAvailable())
      miniApp.setBackgroundColor(color);
    if (miniApp.ready.isAvailable()) miniApp.ready();
  }
  if (viewport.mount.isAvailable()) {
    void viewport.mount().then(() => {
      // --tg-viewport-* vars: stable height and safe-area insets (styles.css)
      if (viewport.bindCssVars.isAvailable()) viewport.bindCssVars();
      if (viewport.expand.isAvailable()) viewport.expand();
      // on desktop fullscreen would take over the whole Telegram window
      const platform = retrieveLaunchParams().tgWebAppPlatform;
      if (
        (platform === "ios" || platform === "android") &&
        viewport.requestFullscreen.isAvailable()
      ) {
        void viewport.requestFullscreen().catch(() => {});
      }
    });
  }
  // a downward scroll at the top would otherwise close or collapse the app
  if (swipeBehavior.mount.isAvailable()) {
    swipeBehavior.mount();
    if (swipeBehavior.disableVertical.isAvailable())
      swipeBehavior.disableVertical();
  }
}

export function isMiniApp(): boolean {
  return active;
}

export function getInitDataRaw(): string | null {
  if (!active) return null;
  let sdk: string | undefined;
  try {
    sdk = retrieveRawInitData();
  } catch {
    sdk = undefined;
  }
  // a reload without the hash leaves the SDK its sessionStorage copy from the WebView's first launch
  const launch = new URLSearchParams(
    (window.__tgLaunchHash ?? "").slice(1),
  ).get("tgWebAppData");
  return freshestInitData(launch, sdk);
}

const authDate = (initData: string) =>
  Number(new URLSearchParams(initData).get("auth_date")) || 0;

/** The candidate with the latest auth_date; the first one on a tie. */
export function freshestInitData(
  ...candidates: (string | null | undefined)[]
): string | null {
  let best: string | null = null;
  for (const candidate of candidates) {
    if (candidate && (best === null || authDate(candidate) > authDate(best)))
      best = candidate;
  }
  return best;
}

/** The user's Telegram photo inside the Mini App; null outside it, without one, or off https. */
export function getTelegramPhotoUrl(): string | null {
  if (!active) return null;
  try {
    const url = retrieveLaunchParams().tgWebAppData?.user?.photo_url;
    return url && isHttpsUrl(url) ? url : null;
  } catch {
    return null;
  }
}

/** ios, android, tdesktop, web…; null outside the Mini App. */
export function getPlatform(): string | null {
  if (!active) return null;
  try {
    return retrieveLaunchParams().tgWebAppPlatform ?? null;
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

interface BackButtonApi {
  show(): void;
  hide(): void;
  onClick(listener: () => void): () => void;
}

/**
 * One native button, many owners (a page's Back under an open sheet): only the top handler
 * fires, removing it hands the button back to the one below. Returns push(entry) => remove.
 */
export function createBackStack(button: BackButtonApi) {
  const stack: { current: (() => void) | null }[] = [];
  let listening = false;
  return (entry: { current: (() => void) | null }) => {
    stack.push(entry);
    if (!listening) {
      button.onClick(() => stack.at(-1)?.current?.());
      listening = true;
    }
    button.show();
    return () => {
      stack.splice(stack.indexOf(entry), 1);
      if (stack.length === 0) button.hide();
    };
  };
}

const pushBack = createBackStack({
  show: () => backButton.show(),
  hide: () => backButton.hide(),
  onClick: (listener) => backButton.onClick(listener),
});

/** Shows Telegram's native back button while mounted; pass null to keep it hidden. */
export function useTelegramBackButton(onBack: (() => void) | null): void {
  // the stack holds this ref: a new handler swaps in place instead of jumping to the top
  const handler = useRef(onBack);
  useEffect(() => {
    handler.current = onBack;
  });
  const enabled = onBack !== null;
  useEffect(() => {
    if (!active || !enabled) return;
    return pushBack(handler);
  }, [enabled]);
}

/** Light impact on the main actions; silent outside the Mini App. */
export function haptic(): void {
  if (active && hapticFeedback.impactOccurred.isAvailable())
    hapticFeedback.impactOccurred("light");
}

export function openExternal(url: string): void {
  // the URLs come from the backend and the panel; whatever they hold, only https leaves
  if (!isHttpsUrl(url)) return;
  // t.me links belong to Telegram itself; openLink would bounce them through the browser
  if (
    active &&
    url.startsWith("https://t.me/") &&
    openTelegramLink.isAvailable()
  )
    openTelegramLink(url);
  else if (active && openLink.isAvailable()) openLink(url);
  else window.location.assign(url);
}

export type StarsInvoiceResult = "paid" | "cancelled" | "failed" | "pending";

/** "pending" outside the Mini App: the link opens in a tab and the result is polled instead. */
export async function openStarsInvoice(
  url: string,
): Promise<StarsInvoiceResult> {
  if (active && invoice.open.isAvailable())
    return (await invoice.open(url, "url")) as StarsInvoiceResult;
  window.open(url, "_blank", "noopener");
  return "pending";
}

/** Resolves true when there was no share sheet and the link went to the clipboard instead. */
export async function share(url: string, text: string): Promise<boolean> {
  if (active && shareURL.isAvailable()) {
    shareURL(url, text);
    return false;
  }
  if (navigator.share) {
    // the user closing the share sheet rejects with AbortError; that's not a failure
    await navigator.share({ url, text }).catch(() => {});
    return false;
  }
  try {
    // no clipboard (insecure context) throws too
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

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
  if (active && hapticFeedback.impactOccurred.isAvailable()) hapticFeedback.impactOccurred("light");
}

export function openExternal(url: string): void {
  // the URLs come from the backend and the panel; whatever they hold, only https leaves
  if (!isHttpsUrl(url)) return;
  // t.me links belong to Telegram itself; openLink would bounce them through the browser
  if (active && url.startsWith("https://t.me/") && openTelegramLink.isAvailable()) openTelegramLink(url);
  else if (active && openLink.isAvailable()) openLink(url);
  else window.location.assign(url);
}

export type StarsInvoiceResult = "paid" | "cancelled" | "failed" | "pending";

/** "pending" outside the Mini App: the link opens in a tab and the result is polled instead. */
export async function openStarsInvoice(url: string): Promise<StarsInvoiceResult> {
  if (active && invoice.open.isAvailable()) return (await invoice.open(url, "url")) as StarsInvoiceResult;
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

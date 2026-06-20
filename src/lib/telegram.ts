import { retrieveRawInitData } from "@telegram-apps/sdk-react";

/**
 * Raw Telegram Mini App `initData` query string when launched inside Telegram,
 * else null. `retrieveRawInitData` throws outside a Mini App — the try/catch
 * makes the plain-web path safe.
 */
export function getInitDataRaw(): string | null {
  try {
    const raw = retrieveRawInitData();
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

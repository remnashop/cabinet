import { readStorage, removeStorage, writeStorage } from "@shared/lib/safe-storage";

// secrets.token_urlsafe(32) on the backend: 43 url-safe characters; the schema caps it at 128
const TOKEN = /^[A-Za-z0-9_-]{20,128}$/;

/** The one-time token from the bot's "Sign in to the cabinet" button, carried in the URL
 *  fragment (`#token=`) so it never reaches a proxy log or a Referer. */
export function readBotSignInToken(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token && TOKEN.test(token) ? token : null;
}

const STASH_KEY = "cabinet_link_bot_token";
const STASH_TTL_MS = 5 * 60_000;

/** /link/bot opened without a session (Telegram's in-app browser): the hash is lost on the way
 *  through /login, so the token waits here for the return to /link/bot. */
export function stashBotLinkToken(hash: string): void {
  const token = readBotSignInToken(hash);
  if (token) writeStorage(STASH_KEY, JSON.stringify({ token, at: Date.now() }), "session");
}

// no removal here: StrictMode runs render-time reads twice; the page clears it once it starts the exchange
export function readStashedBotLinkToken(now = Date.now()): string | null {
  try {
    const stash = JSON.parse(readStorage(STASH_KEY, "session") ?? "null") as { token?: unknown; at?: unknown } | null;
    return typeof stash?.token === "string" && typeof stash.at === "number" && now - stash.at < STASH_TTL_MS
      ? stash.token
      : null;
  } catch {
    return null;
  }
}

export function clearStashedBotLinkToken(): void {
  removeStorage(STASH_KEY, "session");
}

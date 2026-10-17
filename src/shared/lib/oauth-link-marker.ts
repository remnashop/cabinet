import { readStorage, removeStorage, writeStorage } from "@shared/lib/safe-storage";

const KEY = "cabinet_oauth_link";
const TTL_MS = 15 * 60_000;

/** The OAuth callback page is shared with sign-in; this one-time note says the next return is a link. */
export function markOAuthLink(provider: string): void {
  writeStorage(KEY, JSON.stringify({ provider, at: Date.now() }), "session");
}

// a normal sign-in drops a link that was abandoned at the provider
export function clearOAuthLink(): void {
  removeStorage(KEY, "session");
}

/** Always erases the note, so a stale or foreign one can't turn a later sign-in into a link. */
export function takeOAuthLink(provider: string, now = Date.now()): boolean {
  const raw = readStorage(KEY, "session");
  clearOAuthLink();
  try {
    const mark = JSON.parse(raw ?? "null") as {
      provider?: unknown;
      at?: unknown;
    } | null;
    return mark?.provider === provider && typeof mark.at === "number" && now - mark.at < TTL_MS;
  } catch {
    return false;
  }
}

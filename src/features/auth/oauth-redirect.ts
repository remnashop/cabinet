import { authApi } from "@features/auth/api";
import { safeNext } from "@shared/lib/safe-redirect";
import { readStorage, removeStorage, writeStorage } from "@shared/lib/safe-storage";

const NEXT_KEY = "cabinet_oauth_next";
const STATE_KEY = "cabinet_oauth_state";

/** Leaves the app for the provider; ?next= and the provider's state survive the round trip in sessionStorage. */
export async function startOAuth(provider: string, next: string): Promise<void> {
  // the backend builds the redirect URI and binds the state to this browser with a cookie;
  // the callback also checks the state it saw here
  const { url } = await authApi.oauthAuthorize(provider);
  writeStorage(STATE_KEY, new URL(url).searchParams.get("state") ?? "", "session");
  writeStorage(NEXT_KEY, next, "session");
  window.location.assign(url);
}

export function readOAuthState(): string | null {
  return readStorage(STATE_KEY, "session") || null;
}

export function takeOAuthNext(): string {
  const next = readStorage(NEXT_KEY, "session");
  removeStorage(NEXT_KEY, "session");
  removeStorage(STATE_KEY, "session");
  return safeNext(next);
}

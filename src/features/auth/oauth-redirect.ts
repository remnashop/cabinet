import { authApi } from "@features/auth/api";
import { clearOAuthLink } from "@shared/lib/oauth-link-marker";
import { safeNext } from "@shared/lib/safe-redirect";
import { readStorage, removeStorage, writeStorage } from "@shared/lib/safe-storage";

const NEXT_KEY = "cabinet_oauth_next";
const STATE_KEY = "cabinet_oauth_state";
const LEGAL_KEY = "cabinet_oauth_legal";

/** Leaves the app for the provider's url; ?next= and the provider's state survive the round trip in sessionStorage. */
export function redirectToProvider(url: string, next: string): void {
  // the backend binds the state to this browser with a cookie; the callback also checks the state it saw here
  writeStorage(STATE_KEY, new URL(url).searchParams.get("state") ?? "", "session");
  writeStorage(NEXT_KEY, next, "session");
  window.location.assign(url);
}

/** legal: the locale of the legal notice the sign-in showed; the callback sends it, so a new user's acceptance is recorded. */
export async function startOAuth(provider: string, next: string, legal?: string): Promise<void> {
  // the backend builds the redirect URI
  const { url } = await authApi.oauthAuthorize(provider);
  clearOAuthLink();
  if (legal) writeStorage(LEGAL_KEY, legal, "session");
  else removeStorage(LEGAL_KEY, "session");
  redirectToProvider(url, next);
}

export function readOAuthLegal(): string | undefined {
  return readStorage(LEGAL_KEY, "session") || undefined;
}

export function readOAuthState(): string | null {
  return readStorage(STATE_KEY, "session") || null;
}

export function takeOAuthNext(): string {
  const next = readStorage(NEXT_KEY, "session");
  removeStorage(NEXT_KEY, "session");
  removeStorage(STATE_KEY, "session");
  removeStorage(LEGAL_KEY, "session");
  return safeNext(next);
}

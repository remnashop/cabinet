export type OAuthCallback = { ok: true; code: string; state: string } | { ok: false };

/** expectedState: the state this browser saw at authorize; a callback carrying another one is a forged login. */
export function parseOAuthCallback(search: string, expectedState: string | null): OAuthCallback {
  const params = new URLSearchParams(search);
  const code = params.get("code");
  const state = params.get("state");
  if (params.has("error") || !code || !state || state !== expectedState) return { ok: false };
  return { ok: true, code, state };
}

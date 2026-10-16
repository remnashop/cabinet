// secrets.token_urlsafe(32) on the backend: 43 url-safe characters; the schema caps it at 128
const TOKEN = /^[A-Za-z0-9_-]{20,128}$/;

/** The one-time token from the bot's "Sign in to the cabinet" button, carried in the URL
 *  fragment (`#token=`) so it never reaches a proxy log or a Referer. */
export function readBotSignInToken(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token && TOKEN.test(token) ? token : null;
}

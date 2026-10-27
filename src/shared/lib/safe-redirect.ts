/** A post-login target from ?next=; only a same-origin path, else home. */
export function safeNext(next: string | null): string {
  if (!next?.startsWith("/")) return "/";
  // resolve like the browser would: tabs/newlines are stripped, so "/\t/evil.com" means "//evil.com"
  const url = new URL(next, window.location.origin);
  return url.origin === window.location.origin ? url.pathname + url.search + url.hash : "/";
}

/** An https address to send the browser to; dev mocks also redirect to this origin over http. */
export const isHttpsUrl = (url: string): boolean =>
  URL.canParse(url) &&
  (new URL(url).protocol === "https:" || (import.meta.env.DEV && url.startsWith(location.origin)));

/** The bot link from the backend, only if it really points at Telegram. */
export const telegramLink = (url: string): string | undefined =>
  url.startsWith("https://t.me/") ? url : undefined;

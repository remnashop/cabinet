/** A post-login target from ?next=; only a same-origin path, else home. */
export function safeNext(next: string | null): string {
  if (!next?.startsWith("/")) return "/";
  // resolve like the browser would: tabs/newlines are stripped, so "/\t/evil.com" means "//evil.com"
  const url = new URL(next, window.location.origin);
  return url.origin === window.location.origin ? url.pathname + url.search + url.hash : "/";
}

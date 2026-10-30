import type { ConnectApp, ConnectGuide, ConnectPlatform, ConnectStep, PlatformId } from "./api";

export const SUBSCRIPTION_LINK_TOKEN = "{{SUBSCRIPTION_LINK}}";

export function buildDeepLink(template: string, encode: "raw" | "component", subscriptionUrl: string): string {
  return template.replace(SUBSCRIPTION_LINK_TOKEN, encode === "component" ? encodeURIComponent(subscriptionUrl) : subscriptionUrl);
}

const adds = (step: ConnectStep) => step.buttons.some((b) => b.kind === "deep_link" || b.kind === "copy_link");

/**
 * The catalog's steps by stage: up to the first one that adds the subscription the app's install, through
 * the last such one the adding, what follows (connect, pick a server) goes with "done".
 */
export function splitSteps(steps: ConnectStep[]) {
  const first = steps.findIndex(adds);
  if (first === -1) return { app: steps, add: [], done: [] };
  const last = steps.findLastIndex(adds);
  return { app: steps.slice(0, first), add: steps.slice(first, last + 1), done: steps.slice(last + 1) };
}

/**
 * Best guess from the browser; null when nothing matches (a smart TV's browser, an unknown OS). iPadOS
 * Safari claims to be a Mac: only the touch points tell them apart.
 */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): PlatformId | null {
  const ua = userAgent.toLowerCase();
  if (/android/.test(ua)) return /android tv|;\s*aft[a-z]{1,4}\b|mibox|bravia|shield|smart-?tv/.test(ua) ? "androidtv" : "android";
  if (/apple ?tv|tvos/.test(ua)) return "appletv";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/macintosh|mac os x/.test(ua)) return maxTouchPoints > 1 ? "ios" : "macos";
  if (/windows/.test(ua)) return "windows";
  if (/smart-?tv|tizen|web0s|webos|hbbtv|netcast|roku/.test(ua)) return null;
  if (/linux|x11|\bcros\b/.test(ua)) return "linux";
  return null;
}

/** The app to open with: the one picked last time, else the recommended one, else the first. */
export function chooseApp(platform: ConnectPlatform, rememberedId: string | null): ConnectApp | undefined {
  return (
    platform.apps.find((app) => app.id === rememberedId) ??
    platform.apps.find((app) => app.featured) ??
    platform.apps[0]
  );
}

/**
 * What a Mini App hands the browser page it hops to: the deep link, the subscription link it was built
 * from and the backend's signature over that one. The page is public and reads all three from its own
 * address, which anybody can write, so it opens the link only when a catalog button builds exactly it
 * from that subscription and the backend vouches for the subscription.
 */
export interface Hop {
  link: string;
  sub: string;
  sig: string;
}

/** Whether one of the catalog's own buttons builds this deep link from this https subscription link. */
export function catalogBuilds(guide: ConnectGuide, { link, sub }: Hop): boolean {
  if (!sub.startsWith("https://")) return false;
  return guide.platforms.some((platform) =>
    platform.apps.some((app) =>
      app.steps.some((step) =>
        step.buttons.some(
          (button) => button.kind === "deep_link" && buildDeepLink(button.template, button.encode, sub) === link,
        ),
      ),
    ),
  );
}

// base64url: the native link pipelines a Mini App hop passes through leave these characters alone
function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeHop(hop: Hop): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(hop)));
}

const SIGNATURE = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/; // 32 bytes as unpadded base64url

export function decodeHop(value: string): Hop | null {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const json = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
    const { link, sub, sig } = JSON.parse(json) as Partial<Record<keyof Hop, unknown>>;
    if (typeof link !== "string" || typeof sub !== "string" || typeof sig !== "string" || !SIGNATURE.test(sig)) {
      return null;
    }
    return { link, sub, sig };
  } catch {
    return null;
  }
}

/** SHA-256 of the subscription link: what the page sends to have it vouched for, never the link itself. */
export async function linkDigest(sub: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sub))));
}

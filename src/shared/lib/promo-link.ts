import { LINK_CODE, startParamPattern } from "@shared/lib/link-code";
import { readStorage, removeStorage, writeStorage } from "@shared/lib/safe-storage";

/** A promocode the cabinet was opened with: its own code, or an ad link that may carry one. */
export interface PromoLink {
  kind: "promo" | "ad";
  code: string;
}

// session-scoped: a link applies to the visit it opened, not to a later one
const STORAGE_KEY = "cabinet_promo_link";
// a Mini App reload hands the same start_param again
const SEEN_START_KEY = "cabinet_promo_link_start_seen";
const START_PARAM = startParamPattern(["promo", "ad"]);

export function parsePromoLink(search: string, startParam: string | null): PromoLink | null {
  const params = new URLSearchParams(search);
  for (const kind of ["promo", "ad"] as const) {
    const code = params.get(kind);
    if (code && LINK_CODE.test(code)) return { kind, code };
  }
  const match = startParam?.match(START_PARAM);
  return match ? { kind: match[1] as PromoLink["kind"], code: match[2] } : null;
}

/**
 * The latest link wins: opening a new one replaces what an earlier one left unapplied. Returns the address without
 * ?promo= / ?ad= when it had them, for the caller to put back: a reload must not open the link again.
 */
export function capturePromoLink(href: string, startParam: string | null): string | null {
  const url = new URL(href);
  const fromAddress = parsePromoLink(url.search, null);
  const startSeen = startParam !== null && readStorage(SEEN_START_KEY, "session") === startParam;
  const link = fromAddress ?? (startSeen ? null : parsePromoLink("", startParam));
  if (startParam !== null) writeStorage(SEEN_START_KEY, startParam, "session");
  if (link) writeStorage(STORAGE_KEY, JSON.stringify(link), "session");
  if (!fromAddress) return null;
  url.searchParams.delete("promo");
  url.searchParams.delete("ad");
  return url.toString();
}

/** Once: the link is gone the moment it's read, so a reload doesn't apply it again. */
export function takePromoLink(): PromoLink | null {
  const raw = readStorage(STORAGE_KEY, "session");
  removeStorage(STORAGE_KEY, "session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PromoLink;
  } catch {
    return null;
  }
}

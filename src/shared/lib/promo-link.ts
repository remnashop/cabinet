import { readStorage, removeStorage, writeStorage } from "@shared/lib/safe-storage";

/** A promocode the cabinet was opened with: its own code, or an ad link that may carry one. */
export interface PromoLink {
  kind: "promo" | "ad";
  code: string;
}

// session-scoped: a link applies to the visit it opened, not to a later one
const STORAGE_KEY = "cabinet_promo_link";
const CODE = /^[A-Za-z0-9_-]{1,64}$/;
// the bot's deep links, as the Mini App's start_param: promo_<code> / ad_<code>
const START_PARAM = /^(promo|ad)_([A-Za-z0-9_-]{1,64})$/;

export function parsePromoLink(search: string, startParam: string | null): PromoLink | null {
  const params = new URLSearchParams(search);
  for (const kind of ["promo", "ad"] as const) {
    const code = params.get(kind);
    if (code && CODE.test(code)) return { kind, code };
  }
  const match = startParam?.match(START_PARAM);
  return match ? { kind: match[1] as PromoLink["kind"], code: match[2] } : null;
}

/** The latest link wins: opening a new one replaces what an earlier one left unapplied. */
export function capturePromoLink(search: string, startParam: string | null): void {
  const link = parsePromoLink(search, startParam);
  if (link) writeStorage(STORAGE_KEY, JSON.stringify(link), "session");
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

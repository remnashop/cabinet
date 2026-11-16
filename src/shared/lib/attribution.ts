import {
  readStorage,
  removeStorage,
  writeStorage,
} from "@shared/lib/safe-storage";

/** What the browser saw on the first visit; the backend keeps it in the registration snapshot. */
export interface FirstTouch {
  landing_url?: string;
  referer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  click_id?: string;
}

export interface Attribution {
  ref?: string;
  ad?: string;
  first_touch?: FirstTouch;
}

const STORAGE_KEY = "cabinet_attribution";
const CODE = /^[A-Za-z0-9_-]{1,64}$/;
// the bot's deep links: t.me/<bot>?start=ref_<code> / ad_<code>
const START_PARAM = /^(ref|ad)_([A-Za-z0-9_-]{1,64})$/;
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;
const CLICK_ID_KEYS = ["gclid", "yclid", "fbclid"] as const;
// the backend's column widths
const URL_MAX = 512;
const UTM_MAX = 128;
const CLICK_ID_MAX = 256;

export function parseAttribution(
  search: string,
  startParam: string | null,
): Attribution {
  const params = new URLSearchParams(search);
  const result: Attribution = {};
  for (const key of ["ref", "ad"] as const) {
    const value = params.get(key);
    if (value && CODE.test(value)) result[key] = value;
  }
  const match = startParam?.match(START_PARAM);
  if (match) result[match[1] as "ref" | "ad"] = match[2];
  return result;
}

function webUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function parseFirstTouch(href: string, referrer: string): FirstTouch {
  const landing = webUrl(href);
  if (!landing) return {};
  // the hash can hold a sign-in token or Telegram's initData
  const result: FirstTouch = {
    landing_url: `${landing.origin}${landing.pathname}${landing.search}`.slice(
      0,
      URL_MAX,
    ),
  };
  const from = webUrl(referrer);
  // a referrer from the cabinet itself is a page change, not where the customer came from
  if (from && from.origin !== landing.origin)
    result.referer = from.href.slice(0, URL_MAX);
  for (const key of UTM_KEYS) {
    const value = landing.searchParams.get(key);
    if (value) result[key] = value.slice(0, UTM_MAX);
  }
  const clickKey = CLICK_ID_KEYS.find((key) => landing.searchParams.get(key));
  if (clickKey)
    result.click_id = `${clickKey}:${landing.searchParams.get(clickKey)}`.slice(
      0,
      CLICK_ID_MAX,
    );
  return result;
}

/** First touch wins: a later visit or link doesn't overwrite what brought the user in. */
export function captureAttribution(
  href: string,
  referrer: string,
  startParam: string | null,
): void {
  if (readStorage(STORAGE_KEY)) return;
  const url = webUrl(href);
  const attribution: Attribution = {
    ...parseAttribution(url?.search ?? "", startParam),
    first_touch: parseFirstTouch(href, referrer),
  };
  writeStorage(STORAGE_KEY, JSON.stringify(attribution));
}

export function readAttribution(): Attribution {
  try {
    const raw = readStorage(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

export function clearAttribution(): void {
  removeStorage(STORAGE_KEY);
}

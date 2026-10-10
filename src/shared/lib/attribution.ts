import { readStorage, removeStorage, writeStorage } from "@shared/lib/safe-storage";

export interface Attribution {
  ref?: string;
  ad?: string;
}

const STORAGE_KEY = "cabinet_attribution";
const CODE = /^[A-Za-z0-9_-]{1,64}$/;
// the bot's deep links: t.me/<bot>?start=ref_<code> / ad_<code>
const START_PARAM = /^(ref|ad)_([A-Za-z0-9_-]{1,64})$/;

export function parseAttribution(search: string, startParam: string | null): Attribution {
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

/** First touch wins: a later link doesn't overwrite what brought the user in. */
export function captureAttribution(search: string, startParam: string | null): void {
  if (readStorage(STORAGE_KEY)) return;
  const attribution = parseAttribution(search, startParam);
  if (attribution.ref || attribution.ad) writeStorage(STORAGE_KEY, JSON.stringify(attribution));
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

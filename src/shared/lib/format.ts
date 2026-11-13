import i18n from "@shared/i18n";

// the panel's: a glyph for a payment row's icon; an unknown currency shows its code
const CURRENCY_SYMBOL: Readonly<Record<string, string>> = { USD: "$", XTR: "★", RUB: "₽" };

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? currency;
}

/** Backend amounts are Decimal strings; XTR (Telegram Stars) has no currency symbol in Intl. */
export function formatMoney(amount: string | number, currency: string, locale: string): string {
  const value = Number(amount);
  if (currency === "XTR") return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)} ★`;
  // "149 ₽", not "149,00 RUB": kopecks only when there are any
  const digits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Points are a Decimal string ("240.00"): show 240, keep real fractions. */
export function formatNumber(value: string | number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(value));
}

const GB = 1024 ** 3;

export function formatBytes(bytes: number, locale: string): string {
  // nothing at all reads in GB, as the limits it is measured against
  const gb = bytes >= GB || bytes === 0;
  const value = gb ? bytes / GB : bytes / 1024 ** 2;
  const unit = i18n.t(gb ? "units.gb" : "units.mb", { lng: locale });
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

// plan and subscription traffic limits come as whole GB
export function formatGb(gb: number, locale: string): string {
  return formatBytes(gb * GB, locale);
}

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/** How long until `iso`, as the bot says it: days and hours, or hours and minutes under a day ("1 hour 5 minutes"). */
export function formatWait(iso: string, locale: string): string {
  let minutes = Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000));
  const days = Math.floor(minutes / 1440);
  minutes -= days * 1440;
  const hours = Math.floor(minutes / 60);
  minutes -= hours * 60;
  const parts: [Intl.NumberFormatOptions["unit"], number][] = days
    ? [["day", days], ["hour", hours]]
    : [["hour", hours], ["minute", minutes]];
  return parts
    .filter(([, value]) => value > 0)
    .map(([unit, value]) => new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" }).format(value))
    .join(" ");
}

/** The panel's: "5 minutes ago", "2 hours ago", "3 days ago"; under a minute in words, Intl's "this minute" reads oddly. */
export function formatRelative(iso: string, locale: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (minutes === 0) return i18n.t("common.lessThanMinuteAgo", { lng: locale });
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

/** The panel's: "26.10.2026 14:30", the date and the time without the comma between them. */
export function formatDateTime(iso: string, locale: string): string {
  return new Date(iso)
    .toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .replace(",", "");
}

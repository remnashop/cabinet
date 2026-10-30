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

/** The panel's: "26.10.2026 14:30", the date and the time without the comma between them. */
export function formatDateTime(iso: string, locale: string): string {
  return new Date(iso)
    .toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .replace(",", "");
}

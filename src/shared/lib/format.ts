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

const GB = 1024 ** 3;

export function formatBytes(bytes: number, locale: string): string {
  const ru = locale.startsWith("ru");
  const [value, unit] = bytes >= GB ? [bytes / GB, ru ? "ГБ" : "GB"] : [bytes / 1024 ** 2, ru ? "МБ" : "MB"];
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

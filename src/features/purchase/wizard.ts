export type PurchaseType = "NEW" | "RENEW" | "CHANGE";

/** RENEW/CHANGE only make sense for a subscription; anything else is a plain purchase. */
export function parseWizardParams(search: URLSearchParams): {
  type: PurchaseType;
  subId: number | null;
} {
  const type = search.get("type");
  const subId = Number(search.get("sub"));
  if ((type === "RENEW" || type === "CHANGE") && Number.isInteger(subId) && subId > 0) return { type, subId };
  return { type: "NEW", subId: null };
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** 365 → 1 year, 90 → 3 months, 7 → 7 days. */
export function durationUnit(days: number): {
  unit: "years" | "months" | "days";
  count: number;
} {
  if (days % 365 === 0) return { unit: "years", count: days / 365 };
  if (days % 30 === 0) return { unit: "months", count: days / 30 };
  return { unit: "days", count: days };
}

// brands whose casing "Capitalized" gets wrong (same spelling as the dashboard)
const GATEWAY_BRANDS: Record<string, string> = {
  TELEGRAM_STARS: "Telegram Stars",
  YOOKASSA: "YooKassa",
  YOOMONEY: "YooMoney",
  CRYPTOPAY: "CryptoPay",
  FREEKASSA: "FreeKassa",
  MULENPAY: "MulenPay",
  PAYMASTER: "PayMaster",
  ROBOKASSA: "RoboKassa",
  URLPAY: "UrlPay",
  ROLLYPAY: "RollyPay",
  AURAPAY: "AuraPay",
  CLOUDPAYMENTS: "CloudPayments",
  PAYPEAR: "PayPear",
  RIOPAY: "RioPay",
  SEVERPAY: "SeverPay",
};

/** Gateway names are brands, not words to translate. */
export function gatewayLabel(type: string): string {
  return GATEWAY_BRANDS[type] ?? type.charAt(0) + type.slice(1).toLowerCase();
}

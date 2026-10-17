import type { NavigateFunction } from "react-router";

import { isMiniApp, openExternal, openStarsInvoice } from "@shared/telegram";

/** The Stars popup closed unpaid: the customer stays on the summary and can pay again. */
export class StarsInvoiceError extends Error {
  readonly outcome: "cancelled" | "failed";
  constructor(outcome: "cancelled" | "failed") {
    super(`Stars invoice ${outcome}`);
    this.outcome = outcome;
  }
}

/** confirmation_url isn't https: never hand the browser a javascript:/http: link from a gateway. */
export class UnsafePaymentUrlError extends Error {
  constructor() {
    super("Payment URL is not https");
  }
}

// dev: the MSW checkout redirects to http://localhost
const isHttps = (url: string) =>
  URL.canParse(url) && (new URL(url).protocol === "https:" || (import.meta.env.DEV && url.startsWith(location.origin)));

export async function startPayment(
  result: { order_id: number; confirmation_url: string | null },
  gateway: string,
  navigate: NavigateFunction,
): Promise<void> {
  const url = result.confirmation_url;
  const toResult = () => void navigate(`/payment/result?order_id=${result.order_id}`);
  if (url === null) return toResult();
  if (!isHttps(url)) throw new UnsafePaymentUrlError();
  if (!isMiniApp()) return window.location.assign(url);
  // the Mini App stays open: the result screen polls while the user pays
  if (gateway === "TELEGRAM_STARS") {
    // "paid"/"pending" (or a popup that broke) leave it to the order status on the result screen
    const outcome = await openStarsInvoice(url).catch(() => "pending" as const);
    if (outcome === "cancelled" || outcome === "failed") throw new StarsInvoiceError(outcome);
  } else {
    openExternal(url);
  }
  toResult();
}

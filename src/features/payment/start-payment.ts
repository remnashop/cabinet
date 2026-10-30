import type { NavigateFunction } from "react-router";

import { isHttpsUrl } from "@shared/lib/safe-redirect";
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

/** Opens the payment. Resolves to the order to wait for in place (the Mini App: the gateway opens beside it, the
 *  summary's button waits), or null when the page has moved on: to the gateway (the web, which comes back to the
 *  result screen) or straight to the result (nothing to pay at a gateway). */
export async function startPayment(
  result: { order_id: number; confirmation_url: string | null },
  gateway: string,
  navigate: NavigateFunction,
): Promise<number | null> {
  const url = result.confirmation_url;
  if (url === null) {
    void navigate(`/payment/result?order_id=${result.order_id}`);
    return null;
  }
  if (!isHttpsUrl(url)) throw new UnsafePaymentUrlError();
  if (!isMiniApp()) {
    window.location.assign(url);
    return null;
  }
  if (gateway === "TELEGRAM_STARS") {
    // "paid"/"pending" (or a popup that broke) leave it to the order status
    const outcome = await openStarsInvoice(url).catch(() => "pending" as const);
    if (outcome === "cancelled" || outcome === "failed") throw new StarsInvoiceError(outcome);
  } else {
    openExternal(url);
  }
  return result.order_id;
}

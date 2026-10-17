import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCheckout, type PaymentMethod, type Plan } from "@entities/plan/api";
import type { PurchaseType } from "@features/purchase/wizard";
import "@shared/i18n";

import { StarsInvoiceError } from "@features/payment/start-payment";

import { SummaryStep } from "./SummaryStep";

const QUOTE = {
  base_price: "100",
  plan_discount_percent: 0,
  discount_percent: 0,
  discount_source: "NONE",
  final_price: "100",
  currency: "RUB",
};
const fetchQuote = vi.hoisted(() => vi.fn());

// vitest hoists these above the imports; the quote is a real query so invalidation can be observed
vi.mock("@entities/plan/api", async () => {
  const { useQuery } = await import("@tanstack/react-query");
  return {
    createCheckout: vi.fn(async () => ({ order_id: 1, confirmation_url: null })),
    useQuoteQuery: (input: object) => useQuery({ queryKey: ["quote", input], queryFn: fetchQuote }),
  };
});
vi.mock("@entities/session/api", () => ({ useMeQuery: () => ({ data: { email: null } }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const plan = { id: 3, name: "Pro" } as Plan;
let root: ReturnType<typeof createRoot>;
let container: HTMLElement;

// the wizard owns the typed email
function Harness(props: { method: PaymentMethod; type: PurchaseType; subId: number | null; onCreated: () => Promise<void> }) {
  const [email, setEmail] = useState<string | null>(null);
  return <SummaryStep plan={plan} days={30} typedEmail={email} onEmailChange={setEmail} {...props} />;
}

async function render(
  type: PurchaseType,
  subId: number | null,
  requiresEmail = false,
  onCreated: () => Promise<void> = async () => {},
) {
  const method: PaymentMethod = { gateway_type: "YOOKASSA", currency: "RUB", requires_email: requiresEmail };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <Harness method={method} type={type} subId={subId} onCreated={onCreated} />
      </QueryClientProvider>,
    );
  });
}

const payButton = () => [...container.querySelectorAll("button")].at(-1)!;
const checkoutBody = () => vi.mocked(createCheckout).mock.calls[0][0];
const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 10)));

// the checkout chain (mutate → createCheckout → onSuccess → onError → re-render) spans several
// macrotasks (TanStack notifies via setTimeout), more than one act() flush
async function until(check: () => void, timeout = 2000) {
  const end = Date.now() + timeout;
  for (;;) {
    try {
      return check();
    } catch (err) {
      if (Date.now() > end) throw err;
    }
    await tick();
  }
}

beforeEach(() => {
  vi.mocked(createCheckout).mockClear();
  fetchQuote.mockReset().mockResolvedValue(QUOTE);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("SummaryStep", () => {
  it("sends no target subscription for NEW", async () => {
    await render("NEW", null);
    await until(() => expect(payButton().disabled).toBe(false));
    await act(async () => payButton().click());
    await until(() => expect(createCheckout).toHaveBeenCalled());
    expect(checkoutBody()).not.toHaveProperty("target_subscription_id");
  });

  it.each(["RENEW", "CHANGE"] as const)("sends the target subscription for %s", async (type) => {
    await render(type, 9);
    await until(() => expect(payButton().disabled).toBe(false));
    await act(async () => payButton().click());
    await until(() => expect(createCheckout).toHaveBeenCalled());
    expect(checkoutBody()).toMatchObject({ purchase_type: type, target_subscription_id: 9 });
  });

  it("creates one order for two taps in the same frame", async () => {
    await render("NEW", null);
    await until(() => expect(payButton().disabled).toBe(false));
    await act(async () => {
      payButton().click();
      payButton().click();
    });
    await until(() => expect(createCheckout).toHaveBeenCalled());
    // let a late second call surface, if there were one
    for (let i = 0; i < 5; i++) await tick();
    expect(createCheckout).toHaveBeenCalledTimes(1);
  });

  it("stays on the summary when the Stars invoice is cancelled, and Pay works again", async () => {
    await render("NEW", null, false, async () => {
      throw new StarsInvoiceError("cancelled");
    });
    await until(() => expect(payButton().disabled).toBe(false));
    await act(async () => payButton().click());
    await until(() => expect(container.textContent).toContain("Payment cancelled"));
    await until(() => expect(payButton().disabled).toBe(false));
    await act(async () => payButton().click());
    await until(() => expect(createCheckout).toHaveBeenCalledTimes(2));
  });

  it("refetches the quote after a cancelled Stars invoice and holds Pay until it arrives", async () => {
    await render("NEW", null, false, async () => {
      throw new StarsInvoiceError("cancelled");
    });
    await until(() => expect(payButton().disabled).toBe(false));
    // a one-time discount may be spent by the attempt: the next total must come from a fresh quote
    let resolve!: (value: typeof QUOTE) => void;
    fetchQuote.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    await act(async () => payButton().click());
    await until(() => expect(fetchQuote).toHaveBeenCalledTimes(2));
    await until(() => expect(payButton().disabled).toBe(true));
    // and it stays held while the quote is in flight
    for (let i = 0; i < 5; i++) await tick();
    expect(payButton().disabled).toBe(true);
    await act(async () => resolve({ ...QUOTE, final_price: "120" }));
    await until(() => expect(payButton().disabled).toBe(false));
    expect(payButton().textContent).toContain("120");
  });

  it("keeps Pay disabled while a required email is empty", async () => {
    await render("NEW", null, true);
    expect(payButton().disabled).toBe(true);
    const input = container.querySelector("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "a@b.co");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await until(() => expect(payButton().disabled).toBe(false));
  });
});

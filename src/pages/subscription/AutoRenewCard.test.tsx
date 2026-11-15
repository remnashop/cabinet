import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AutoRenewState } from "@entities/subscription/api";
import "@shared/i18n";
import { until } from "@shared/testing/until";

import { AutoRenewCard } from "./AutoRenewCard";

const TERMS = {
  terms_id: "b".repeat(64),
  summary: "Charges up to 100 RUB every 30 days",
  text: "Full renewal terms",
  amount_limit: "100",
  currency: "RUB",
  duration_days: 30,
};
const state = vi.hoisted(() => ({ current: null as AutoRenewState | null }));
const mutate = vi.hoisted(() => vi.fn());

vi.mock("@entities/subscription/api", () => ({
  useAutoRenewQuery: () => ({ data: state.current }),
  useSetAutoRenew: () => ({ mutate, isPending: false, error: null }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function base(overrides: Partial<AutoRenewState>): AutoRenewState {
  return {
    subscription_id: 7,
    terms: null,
    accepted_terms: null,
    enabled: false,
    available: false,
    customer_disabled: false,
    can_disable: false,
    paused: false,
    retrying: false,
    payment_pending: false,
    payment_in_flight: false,
    next_payment_at: null,
    next_retry_at: null,
    amount_limit: "100",
    currency: "RUB",
    duration_days: 30,
    last_error: null,
    ...overrides,
  };
}

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;

const button = (label: string) =>
  [...document.body.querySelectorAll("button")].find((b) => b.textContent?.includes(label))!;

beforeEach(() => {
  mutate.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("AutoRenewCard", () => {
  it("shows nothing for a subscription without auto-renewal", async () => {
    state.current = base({});
    await act(async () => root.render(<AutoRenewCard subscriptionId={7} />));
    expect(container.textContent).toBe("");
  });

  it("disables auto-renewal after the customer confirms", async () => {
    state.current = base({ enabled: true, can_disable: true, accepted_terms: TERMS });
    await act(async () => root.render(<AutoRenewCard subscriptionId={7} />));
    await act(async () => button("Disable auto-renewal").click());
    await until(() => expect(button("Disable")).toBeTruthy());
    const confirm = [...document.body.querySelectorAll("button")].filter((b) =>
      b.textContent?.includes("Disable"),
    );
    await act(async () => confirm.at(-1)!.click());
    expect(mutate).toHaveBeenCalledWith({ enabled: false }, expect.anything());
  });

  it("enables auto-renewal only with the terms it showed", async () => {
    state.current = base({ available: true, terms: TERMS });
    await act(async () => root.render(<AutoRenewCard subscriptionId={7} />));
    expect(container.textContent).toContain(TERMS.summary);
    await act(async () => button("Enable auto-renewal").click());
    await until(() => expect(document.body.textContent).toContain(TERMS.text));
    await act(async () => button("I agree, enable").click());
    expect(mutate).toHaveBeenCalledWith({ enabled: true, terms_id: TERMS.terms_id }, expect.anything());
  });
});

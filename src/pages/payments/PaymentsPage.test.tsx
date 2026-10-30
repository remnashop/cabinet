import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import i18n from "@shared/i18n";

import { PaymentsPage } from "./PaymentsPage";

void i18n.changeLanguage("ru");

const query = vi.hoisted(() => ({ current: {} as object }));
const getTransaction = vi.hoisted(() => vi.fn());
vi.mock("@entities/transaction/api", () => ({
  useTransactionsInfinite: () => query.current,
  getTransaction,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const observe = vi.fn();
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe = observe;
    disconnect = vi.fn();
  },
);

const base = {
  data: {
    pages: [
      {
        items: [
          {
            id: 1,
            status: "PAID",
            final_price: "10",
            currency: "RUB",
            purchase_type: "NEW",
            gateway_type: "YOOKASSA",
            plan_name: "P",
            duration_days: 30,
            created_at: null,
          },
        ],
        total: 40,
        page: 1,
        page_size: 20,
      },
    ],
  },
  hasNextPage: true,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
};

function Where() {
  const l = useLocation();
  return <i id="where">{l.pathname + l.search}</i>;
}

async function render(url = "/") {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <PaymentsPage />
        <Where />
      </MemoryRouter>,
    ),
  );
  return { container, where: () => container.querySelector("#where")?.textContent, unmount: () => act(async () => root.unmount()) };
}

afterEach(() => observe.mockClear());

describe("PaymentsPage infinite list", () => {
  it("watches the sentinel while nothing failed", async () => {
    query.current = { ...base, isFetchNextPageError: false };
    const { unmount } = await render();
    expect(observe).toHaveBeenCalled();
    await unmount();
  });

  it("stops observing after a failed page and shows the error beside the retry button", async () => {
    query.current = { ...base, isFetchNextPageError: true };
    const { container, unmount } = await render();
    expect(observe).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Не удалось загрузить");
    await unmount();
  });

  it("shows a transaction once when a new payment shifted it onto the next page too", async () => {
    const page = base.data.pages[0]!;
    query.current = { ...base, data: { pages: [page, { ...page, page: 2 }] }, isFetchNextPageError: false };
    const { container, unmount } = await render();
    expect(container.textContent!.split("P · ").length - 1).toBe(1);
    await unmount();
  });
});

describe("PaymentsPage link", () => {
  it("opens the linked payment and drops the param", async () => {
    query.current = { ...base, isFetchNextPageError: false };
    getTransaction.mockResolvedValue({ ...base.data.pages[0].items[0], id: 42, base_price: "10" });
    const { where, unmount } = await render("/profile/payments?id=42");
    expect(getTransaction).toHaveBeenCalledWith("42");
    expect(document.body.textContent).toContain("42");
    expect(where()).toBe("/profile/payments");
    await unmount();
  });

  it("shows just the list when the payment is gone", async () => {
    query.current = { ...base, isFetchNextPageError: false };
    getTransaction.mockRejectedValue(new Error("404"));
    const { where, unmount } = await render("/?id=43");
    expect(where()).toBe("/");
    await unmount();
  });
});

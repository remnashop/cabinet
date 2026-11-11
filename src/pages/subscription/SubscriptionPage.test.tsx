import { act } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { SubscriptionPage } from "./SubscriptionPage";

const state = vi.hoisted(() => ({
  catalog: { isPending: false, isError: false, data: { items: [{ id: 3 }] } } as object,
}));

vi.mock("@entities/appearance/api", () => ({ useBrandName: () => "Brand" }));
vi.mock("@entities/appearance/BrandMark", () => ({ BrandMark: () => null }));
vi.mock("@entities/plan/api", () => ({ useCatalogQuery: () => state.catalog }));
vi.mock("@entities/referral/api", () => ({
  invitedCount: () => 0,
  useRedeemTargetsQuery: () => ({ data: undefined }),
  useReferralQuery: () => ({ data: undefined }),
}));
vi.mock("@entities/session/api", () => ({ maxDiscount: () => 0, useMeQuery: () => ({ data: undefined }) }));
vi.mock("@entities/shop/api", () => ({
  useCabinetSettingsQuery: () => ({ isPending: false, isError: false, data: { max_active_subscriptions: null } }),
}));
vi.mock("@entities/subscription/api", () => ({
  useActivateTrial: () => ({}),
  useTrialQuery: () => ({}),
  useSubscriptionsQuery: () => ({
    isPending: false,
    isError: false,
    isSuccess: true,
    data: {
      items: [
        { id: 5, plan_id: 9, is_trial: false, expire_at: "2030-01-01T00:00:00Z" },
        { id: 7, plan_id: 3, is_trial: false, expire_at: "2030-01-01T00:00:00Z" },
      ],
    },
  }),
}));
vi.mock("@entities/subscription/lib", () => ({
  canBuyMore: () => true,
  canRenew: (s: { plan_id: number }, items: { id: number }[]) => items.some((p) => p.id === s.plan_id),
  cardNotice: () => null,
}));
vi.mock("@features/push-prompt/PushPromptCard", () => ({ PushPromptCard: () => null }));
vi.mock("@widgets/devices/DevicesCard", () => ({ DevicesCard: () => null }));
vi.mock("@widgets/page-header/HeaderSlot", () => ({ HeaderSlot: () => null }));
vi.mock("@widgets/promo/PromoDialog", () => ({ PromoDialog: () => null }));
vi.mock("@widgets/redeem-days/RedeemDaysSheet", () => ({ RedeemDaysSheet: () => null }));
vi.mock("@widgets/subscription-cards/CardsSlider", () => ({
  CardsSlider: ({ selectedId }: { selectedId: number }) => <div data-testid="selected">{selectedId}</div>,
}));
vi.mock("@widgets/subscription-cards/SubscriptionCard", () => ({ NoticeBar: () => null }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Where() {
  const l = useLocation();
  return <i data-testid="where">{l.pathname + l.search}</i>;
}

async function render(url: string) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/" element={<SubscriptionPage />} />
          <Route path="*" element={null} />
        </Routes>
        <Where />
      </MemoryRouter>,
    ),
  );
  const text = (id: string) => container.querySelector(`[data-testid=${id}]`)?.textContent;
  return { text, unmount: () => act(async () => root.unmount()) };
}

describe("SubscriptionPage notification links", () => {
  it("selects the linked subscription and drops the param", async () => {
    const { text, unmount } = await render("/?sub=7");
    expect(text("selected")).toBe("7");
    expect(text("where")).toBe("/");
    await unmount();
  });

  it("falls back to the first card when the subscription is unknown", async () => {
    const { text, unmount } = await render("/?sub=99");
    expect(text("selected")).toBe("5");
    expect(text("where")).toBe("/");
    await unmount();
  });

  it("goes to renewal with renew=1", async () => {
    const { text, unmount } = await render("/?sub=7&renew=1");
    expect(text("where")).toBe("/purchase/3?type=RENEW&sub=7");
    await unmount();
  });

  it("changes the plan when there is no plan to renew into", async () => {
    state.catalog = { isPending: false, isError: false, data: { items: [] } };
    const { text, unmount } = await render("/?sub=7&renew=1");
    expect(text("where")).toBe("/purchase?type=CHANGE&sub=7");
    await unmount();
  });

  it("stays home without params when the subscription is unknown", async () => {
    const { text, unmount } = await render("/?sub=99&renew=1");
    expect(text("where")).toBe("/");
    await unmount();
  });

  it("keeps a renewal's sub while it fades out on the wizard's address", async () => {
    // AnimatedOutlet keeps the old page rendered for its exit, under the new location
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={["/purchase/3?type=RENEW&sub=7"]}>
          <SubscriptionPage />
          <Where />
        </MemoryRouter>,
      ),
    );
    expect(container.querySelector("[data-testid=where]")?.textContent).toBe("/purchase/3?type=RENEW&sub=7");
    await act(async () => root.unmount());
  });

  it("leaves unknown params alone", async () => {
    const { text, unmount } = await render("/?sub=7&support=1");
    expect(text("where")).toBe("/?support=1");
    await unmount();
  });

  describe("when home is already open", () => {
    async function renderOpen() {
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: (
              <>
                <SubscriptionPage />
                <Where />
              </>
            ),
          },
          { path: "*", element: <Where /> },
        ],
        { initialEntries: ["/?sub=5"] },
      );
      await act(async () => root.render(<RouterProvider router={router} />));
      const text = (id: string) => container.querySelector(`[data-testid=${id}]`)?.textContent;
      return { text, router, unmount: () => act(async () => root.unmount()) };
    }

    it("follows ?sub= and drops the param", async () => {
      const { text, router, unmount } = await renderOpen();
      expect(text("selected")).toBe("5");
      await act(async () => {
        await router.navigate("/?sub=7");
      });
      expect(text("selected")).toBe("7");
      expect(text("where")).toBe("/");
      await unmount();
    });

    it("follows ?sub=&renew=1 to the renewal", async () => {
      state.catalog = { isPending: false, isError: false, data: { items: [{ id: 3 }] } };
      const { text, router, unmount } = await renderOpen();
      await act(async () => {
        await router.navigate("/?sub=7&renew=1");
      });
      expect(text("where")).toBe("/purchase/3?type=RENEW&sub=7");
      await unmount();
    });
  });
});

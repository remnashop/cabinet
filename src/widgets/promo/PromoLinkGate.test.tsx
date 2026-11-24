import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@shared/api/http";
import type { PromoLink } from "@shared/lib/promo-link";
import { PromoLinkGate } from "@widgets/promo/PromoLinkGate";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({
  pendingLegal: 0,
  activateByLink: vi.fn(),
  activateAdLink: vi.fn(),
}));

vi.mock("@entities/legal/api", () => ({
  usePendingLegalQuery: () => ({ isPending: false, data: { items: Array(state.pendingLegal).fill({}) } }),
}));
vi.mock("@entities/session/api", () => ({ useMeQuery: () => ({ isPending: false, data: { email: "a@b.c" } }) }));
vi.mock("@features/auth/api", () => ({ useAuthMethodsQuery: () => ({ isPending: false, data: { email_required: false } }) }));
vi.mock("@entities/plan/api", () => ({
  activatePromocodeByLink: state.activateByLink,
  activateAdLinkPromocode: state.activateAdLink,
}));
// the dialog itself is PromoDialog's business: here only whether it opens, and on what
vi.mock("@widgets/promo/PromoDialog", () => ({
  PromoDialog: ({ link }: { link: unknown }) => <div data-testid="dialog">{JSON.stringify(link)}</div>,
}));

const PROMO = { code: "GIFT", reward_type: "DURATION", reward: 7, reward_duration_days: 7, reward_plan_id: null, reward_addon_id: null };

async function mount(link: PromoLink): Promise<HTMLElement> {
  sessionStorage.setItem("cabinet_promo_link", JSON.stringify(link));
  const container = document.createElement("div");
  await act(async () =>
    createRoot(container).render(
      <QueryClientProvider client={new QueryClient()}>
        <PromoLinkGate />
      </QueryClientProvider>,
    ),
  );
  return container;
}

beforeEach(() => {
  sessionStorage.clear();
  state.pendingLegal = 0;
  state.activateByLink.mockReset();
  state.activateAdLink.mockReset();
});

it("opens the dialog on what a promocode link did, once", async () => {
  state.activateByLink.mockResolvedValue({ outcome: "ACTIVATED", promocode: PROMO });

  const container = await mount({ kind: "promo", code: "gift" });

  expect(state.activateByLink).toHaveBeenCalledWith("gift");
  expect(container.textContent).toContain('"outcome":"ACTIVATED"');
  expect(sessionStorage.getItem("cabinet_promo_link")).toBeNull();
});

it("waits for documents still to accept before applying anything", async () => {
  state.pendingLegal = 1;

  await mount({ kind: "promo", code: "gift" });

  expect(state.activateByLink).not.toHaveBeenCalled();
  expect(sessionStorage.getItem("cabinet_promo_link")).not.toBeNull();
});

it("keeps quiet about a refused ad link promocode and an old backend", async () => {
  state.activateAdLink.mockRejectedValueOnce(new ApiError(400, "used", "PROMOCODE_ALREADY_ACTIVATED"));
  const refused = await mount({ kind: "ad", code: "spring" });
  state.activateByLink.mockRejectedValueOnce(new ApiError(404, "Not Found"));
  const old = await mount({ kind: "promo", code: "gift" });

  expect(refused.textContent).toBe("");
  expect(old.textContent).toBe("");
});

it("shows a refused promocode link with its code", async () => {
  state.activateByLink.mockRejectedValue(new ApiError(404, "missing", "PROMOCODE_NOT_FOUND"));

  const container = await mount({ kind: "promo", code: "gift" });

  expect(container.textContent).toContain('"code":"GIFT"');
});

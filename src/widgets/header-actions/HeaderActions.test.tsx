import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";

import { logout } from "@features/auth/logout";
import i18n from "@shared/i18n";

import { HeaderActions } from "./HeaderActions";

vi.mock("@entities/session/api", () => ({
  useMeQuery: () => ({ data: { name: "Ivan" } }),
  useChangeLanguage: () => ({ reset: vi.fn(), mutate: vi.fn(), isPending: false, isError: false }),
}));
vi.mock("@features/auth/logout", () => ({ logout: vi.fn(() => Promise.resolve()) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("the account menu signs out, once confirmed", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <HeaderActions />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
  const button = (text: string) =>
    [...document.body.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === text || b.textContent === text);

  expect(button(i18n.t("common.logout"))).toBeUndefined();
  await act(async () => button(i18n.t("header.account"))!.click());
  await act(async () => button(i18n.t("common.logout"))!.click());
  // the menu item only asks
  expect(logout).not.toHaveBeenCalled();
  const confirm = [...document.body.querySelectorAll("[role=dialog] button")].find(
    (b) => b.textContent === i18n.t("common.logout"),
  ) as HTMLButtonElement;
  await act(async () => confirm.click());

  expect(logout).toHaveBeenCalledOnce();
  act(() => root.unmount());
  container.remove();
});

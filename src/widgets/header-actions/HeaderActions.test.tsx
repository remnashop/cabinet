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
  const button = (text: string) => [...document.body.querySelectorAll("button")].find((b) => b.textContent === text);
  // the account button is the one with the chevron
  const account = () => document.body.querySelector(".lucide-chevron-down")!.closest("button")!;

  expect(button(i18n.t("common.logout"))).toBeUndefined();
  await act(async () => account().click());
  await act(async () => button(i18n.t("common.logout"))!.click());
  // the menu item only asks
  expect(logout).not.toHaveBeenCalled();
  const confirm = [...document.body.querySelectorAll("[data-dialog] button")].find(
    (b) => b.textContent === i18n.t("common.logout"),
  ) as HTMLButtonElement;
  await act(async () => confirm.click());

  expect(logout).toHaveBeenCalledOnce();
  act(() => root.unmount());
  container.remove();
});

it("opening the bell marks the feed read once and the counter goes", async () => {
  const feed = {
    unread_count: 2,
    items: [{ id: 1, event_type: "X", title: "Paid", body: "b", url: "/", created_at: "2026-10-30T10:00:00Z", read: false }],
  };
  const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    Promise.resolve(
      init?.method === "POST"
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(feed), { status: 200, headers: { "content-type": "application/json" } }),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
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
  const bell = () => document.body.querySelector(".lucide-bell")!.closest("button")!;
  await vi.waitFor(() => expect(bell().textContent).toBe("2"));

  await act(async () => bell().click());
  await vi.waitFor(() => expect(bell().textContent).toBe(""));
  const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
  expect(posts()).toHaveLength(1);
  // the dot of what was new stays while the popover is open
  expect(document.body.querySelector("[data-unread]")).not.toBeNull();

  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

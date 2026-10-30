import { act } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";

import "@shared/i18n";

import { PageHeader } from "./PageHeader";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let telegramBack: (() => void) | null = null;
vi.mock("@shared/telegram", () => ({
  isMiniApp: () => true,
  useTelegramBackButton: (onBack: (() => void) | null) => {
    telegramBack = onBack;
  },
}));

it("Telegram's back button returns without growing the history", async () => {
  const router = createMemoryRouter(
    [
      { path: "/profile", element: <div>profile</div> },
      { path: "/profile/payments", element: <PageHeader title="Payments" backTo="/profile" /> },
    ],
    { initialEntries: ["/profile", "/profile/payments"], initialIndex: 1 },
  );
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<RouterProvider router={router} />));

  await act(async () => telegramBack?.());

  expect(router.state.location.pathname).toBe("/profile");
  expect(router.state.historyAction).toBe("REPLACE");
  act(() => root.unmount());
});

it("onBack drives Telegram's back button instead of backTo", async () => {
  const onBack = vi.fn();
  const router = createMemoryRouter(
    [{ path: "/w", element: <PageHeader title="Wizard" backTo="/" onBack={onBack} /> }],
    { initialEntries: ["/w"] },
  );
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<RouterProvider router={router} />));

  await act(async () => telegramBack?.());

  expect(onBack).toHaveBeenCalledOnce();
  expect(router.state.location.pathname).toBe("/w");
  act(() => root.unmount());
});

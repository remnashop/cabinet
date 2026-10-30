import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { expect, it, vi } from "vitest";

import { useSignOut } from "@widgets/app-shell/sign-out";

import { AppShell } from "./AppShell";

const mocks = vi.hoisted(() => ({
  endSession: vi.fn(async () => {}),
  revokeSession: vi.fn(),
  onMessage: undefined as undefined | ((message: { type: string; url: string }) => void),
}));
vi.mock("@features/auth/logout", () => mocks);
vi.mock("@entities/shop/api", () => ({
  useSupportLinks: () => ({ telegram: null, web: null }),
  useCabinetSettingsQuery: () => ({ isPending: false }),
}));
vi.mock("@features/legal-reacceptance/LegalReacceptanceGate", () => ({ LegalReacceptanceGate: () => null }));
vi.mock("@widgets/app-shell/Sidebar", () => {
  const Sidebar = () => <button id="out" onClick={useSignOut()} />;
  return { Sidebar };
});
vi.mock("@widgets/app-shell/BottomNav", () => {
  const BottomNav = () => {
    const { pathname, search } = useLocation();
    return <i id="loc">{pathname + search}</i>;
  };
  return { BottomNav };
});
vi.mock("@widgets/header-actions/HeaderActions", () => ({ HeaderActions: () => null }));
vi.mock("@shared/lib/push", () => ({
  registerServiceWorker: vi.fn(),
  healPushSubscription: vi.fn(async () => {}),
  onServiceWorkerMessage: (handler: typeof mocks.onMessage) => {
    mocks.onMessage = handler;
    return () => undefined;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("signs out through endSession, so this device's push goes off too", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
  await act(async () => container.querySelector<HTMLButtonElement>("#out")!.click());
  expect(mocks.endSession).toHaveBeenCalledOnce();
  expect(mocks.revokeSession).not.toHaveBeenCalled();
  act(() => root.unmount());
});

it("routes in-app on a push click's navigate message, same origin only", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
  const here = () => container.querySelector("#loc")!.textContent;
  await act(async () => mocks.onMessage!({ type: "navigate", url: `${location.origin}/subscription?x=1#h` }));
  expect(here()).toBe("/subscription?x=1");
  await act(async () => mocks.onMessage!({ type: "navigate", url: "https://evil.example/profile" }));
  expect(here()).toBe("/subscription?x=1");
  act(() => root.unmount());
});

it("a ?support=1 landing strips the param on any shell page", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/subscription?support=1"]}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
  await vi.waitFor(() => expect(container.querySelector("#loc")!.textContent).toBe("/subscription"));
  act(() => root.unmount());
});

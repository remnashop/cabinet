import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { expect, it, vi } from "vitest";

import i18n from "@shared/i18n";

import { SignOutOthersDialog } from "./SignOutOthersDialog";
import { useSignOutOthersLink } from "./use-sign-out-others-link";

const revoke = vi.hoisted(() => vi.fn(async () => null));
vi.mock("@features/auth/api", () => ({ revokeOtherSessions: revoke }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Page() {
  const [open, setOpen] = useState(false);
  useSignOutOthersLink(() => setOpen(true));
  const { pathname, search } = useLocation();
  return (
    <>
      <b id="loc">{pathname + search}</b>
      <SignOutOthersDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

it("?signout=others opens the confirm, strips the param, and confirming revokes and says so", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/profile?signout=others"]}>
          <Page />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
  expect(container.querySelector("#loc")!.textContent).toBe("/profile");
  const text = () => document.body.textContent ?? "";
  expect(text()).toContain(i18n.t("signOut.othersTitle"));
  const confirm = [...document.body.querySelectorAll("button")].find((b) => b.textContent === i18n.t("signOut.others"))!;
  await act(async () => confirm.click());
  expect(revoke).toHaveBeenCalledOnce();
  expect(text()).toContain(i18n.t("signOut.othersDone"));
  act(() => root.unmount());
});

it("a failed revoke keeps the confirm open and says so inside it", async () => {
  revoke.mockRejectedValueOnce(new Error("boom"));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/profile?signout=others"]}>
          <Page />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
  const confirm = [...document.body.querySelectorAll("button")].find((b) => b.textContent === i18n.t("signOut.others"))!;
  await act(async () => confirm.click());
  await vi.waitFor(() => expect(document.body.textContent).toContain(i18n.t("errors.generic")));
  const text = document.body.textContent ?? "";
  expect(text).toContain(i18n.t("signOut.othersTitle"));
  expect(text).not.toContain(i18n.t("signOut.othersDone"));
  act(() => root.unmount());
});

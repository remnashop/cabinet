import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { expect, it, vi } from "vitest";

import { useSupportFromLink } from "./use-support";

const settings = vi.hoisted(() => ({ links: { telegram: null as string | null, web: null as string | null }, pending: false }));
vi.mock("@entities/shop/api", () => ({
  useSupportLinks: () => settings.links,
  useCabinetSettingsQuery: () => ({ isPending: settings.pending }),
}));
vi.mock("./SupportDialog", () => ({ SupportDialog: ({ open }: { open: boolean }) => open && <i id="dialog" /> }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Page() {
  const dialog = useSupportFromLink();
  const { pathname, search } = useLocation();
  return (
    <>
      <b id="loc">{pathname + search}</b>
      {dialog}
    </>
  );
}

async function visit(url: string) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <Page />
      </MemoryRouter>,
    ),
  );
  return { container, done: () => act(() => root.unmount()) };
}

it("?support=1 opens the dialog and strips the param", async () => {
  settings.links = { telegram: "https://t.me/x", web: null };
  const { container, done } = await visit("/subscription?support=1&a=2");
  expect(container.querySelector("#dialog")).not.toBeNull();
  expect(container.querySelector("#loc")!.textContent).toBe("/subscription?a=2");
  done();
});

it("without support configured the param is stripped and no dialog shows", async () => {
  settings.links = { telegram: null, web: null };
  const { container, done } = await visit("/?support=1");
  expect(container.querySelector("#dialog")).toBeNull();
  expect(container.querySelector("#loc")!.textContent).toBe("/");
  done();
});

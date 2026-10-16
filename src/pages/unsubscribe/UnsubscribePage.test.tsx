import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "@shared/i18n";

import { UnsubscribePage } from "./UnsubscribePage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;
let fetchMock: ReturnType<typeof vi.fn>;

async function render(search: string) {
  window.history.replaceState(null, "", `/unsubscribe${search}`);
  const router = createMemoryRouter([{ path: "/unsubscribe", element: <UnsubscribePage /> }], {
    initialEntries: [`/unsubscribe${search}`],
  });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  });
  return router;
}

const button = () => container.querySelector("button");
const unsubscribeCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes("/unsubscribe"));

async function click() {
  await act(async () => button()?.click());
  await act(async () => {});
}

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("UnsubscribePage", () => {
  it("sends nothing until the visitor clicks", async () => {
    const router = await render("?token=42.sig");
    expect(unsubscribeCalls()).toHaveLength(0);
    expect(router.state.location.search).toBe("");
  });

  it("unsubscribes on click with the token from the link", async () => {
    await render("?token=42.sig");
    await click();
    const [[url, init]] = unsubscribeCalls();
    expect(String(url)).toBe("/api/unsubscribe?token=42.sig");
    expect((init as RequestInit).method).toBe("POST");
    expect(container.textContent).toContain("unsubscribed");
    expect(button()).toBeNull();
  });

  it("shows the invalid-link error and lets the visitor retry", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ detail: "Invalid", code: "UNSUBSCRIBE_TOKEN_INVALID" }, { status: 400 }),
    );
    await render("?token=bad");
    await click();
    expect(container.textContent).toContain("The unsubscribe link is invalid");
    expect(button()).not.toBeNull();
  });

  it("without a token says the link is invalid and offers no button", async () => {
    await render("");
    expect(container.textContent).toContain("The unsubscribe link is invalid");
    expect(button()).toBeNull();
  });
});

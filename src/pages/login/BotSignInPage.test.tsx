import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearAccessToken, setAccessToken } from "@shared/api/tokens";
import "@shared/i18n";

import { BotSignInPage } from "./BotSignInPage";

const TOKEN = "A".repeat(43);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;
let fetchMock: ReturnType<typeof vi.fn>;

async function render() {
  const router = createMemoryRouter(
    [
      { path: "/login/bot", element: <BotSignInPage /> },
      { path: "/", element: <div>home</div> },
    ],
    { initialEntries: [`/login/bot#token=${TOKEN}`] },
  );
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  await act(async () => {
    root.render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StrictMode>,
    );
  });
  await act(async () => {});
  return router;
}

const signinCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/telegram/signin"));

beforeEach(() => {
  window.history.replaceState(null, "", `/login/bot#token=${TOKEN}`);
  fetchMock = vi.fn(async () => Response.json({ access_token: "a2", expires_in: 900 }));
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  clearAccessToken();
  vi.unstubAllGlobals();
});

describe("BotSignInPage", () => {
  it("does not exchange the token for a signed-in visitor", async () => {
    setAccessToken({ access_token: "a1", expires_in: 900 });
    const router = await render();
    expect(signinCalls()).toHaveLength(0);
    expect(router.state.location.pathname).toBe("/");
  });

  it("exchanges the token once for an anonymous visitor", async () => {
    const router = await render();
    expect(signinCalls()).toHaveLength(1);
    const [url, init] = signinCalls()[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/telegram/signin");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ token: TOKEN });
    expect(router.state.location.pathname).toBe("/");
  });

  it("sends the legal notice's locale remembered where the link was asked for, once", async () => {
    window.localStorage.setItem("cabinet_bot_legal", "ru");
    await render();
    const [, init] = signinCalls()[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ token: TOKEN, legal_locale: "ru" });
    expect(window.localStorage.getItem("cabinet_bot_legal")).toBeNull();
  });

  it("names the real reason when the exchange fails", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ detail: "blocked", code: "USER_BLOCKED" }, { status: 403 }),
    );
    await render();
    expect(container.textContent).toContain("Couldn't sign you in");
    expect(container.textContent).toContain("Your account is blocked");
    expect(container.textContent).not.toContain("expired");
  });

  it("says the link expired when there is no token", async () => {
    window.history.replaceState(null, "", "/login/bot");
    await render();
    expect(signinCalls()).toHaveLength(0);
    expect(container.textContent).toContain("This sign-in link has expired");
  });
});

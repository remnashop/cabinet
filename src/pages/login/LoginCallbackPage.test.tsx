import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { markOAuthLink } from "@shared/lib/oauth-link-marker";
import { clearAccessToken, setAccessToken } from "@shared/api/tokens";
import "@shared/i18n";

import { LoginCallbackPage } from "./LoginCallbackPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;
let fetchMock: ReturnType<typeof vi.fn>;

async function render() {
  const router = createMemoryRouter(
    [
      { path: "/login/callback/:provider", element: <LoginCallbackPage /> },
      { path: "*", element: <div>next</div> },
    ],
    { initialEntries: ["/login/callback/google?code=c1&state=s1"] },
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

const calls = () => fetchMock.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, "", "/login/callback/google?code=c1&state=s1");
  sessionStorage.setItem("cabinet_oauth_state", "s1");
  setAccessToken({ access_token: "a1", expires_in: 900 });
  fetchMock = vi.fn(async (url: string) =>
    String(url).includes("/identities/")
      ? Response.json({ status: "linked" })
      : Response.json({ access_token: "a2", expires_in: 900 }),
  );
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

describe("LoginCallbackPage", () => {
  it("links once and hands the result to the profile when the link marker is set", async () => {
    markOAuthLink("google");
    sessionStorage.setItem("cabinet_oauth_next", "/profile");
    const router = await render();
    expect(calls()).toEqual(["/api/users/me/identities/oauth/google/callback"]);
    expect(router.state.location.pathname).toBe("/profile");
    expect(router.state.location.state).toEqual({ linkResult: { status: "linked" }, linkKind: "GOOGLE" });
    expect(sessionStorage.getItem("cabinet_oauth_link")).toBeNull();
  });

  it("erases the marker and leads back to the profile when the provider was cancelled", async () => {
    markOAuthLink("google");
    window.history.replaceState(null, "", "/login/callback/google?error=access_denied&state=s1");
    await render();
    expect(calls()).toEqual([]);
    expect(sessionStorage.getItem("cabinet_oauth_link")).toBeNull();
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/profile");
  });

  it("signs in without a marker", async () => {
    await render();
    expect(calls()).toEqual(["/api/auth/oauth/google/callback"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ code: "c1", state: "s1" });
  });

  it("sends the locale of the legal notice the sign-in showed, then forgets it", async () => {
    sessionStorage.setItem("cabinet_oauth_legal", "ru");
    await render();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ code: "c1", state: "s1", legal_locale: "ru" });
    expect(sessionStorage.getItem("cabinet_oauth_legal")).toBeNull();
  });

  it("signs in when the marker is for another provider, and drops it", async () => {
    markOAuthLink("yandex");
    await render();
    expect(calls()).toEqual(["/api/auth/oauth/google/callback"]);
    expect(sessionStorage.getItem("cabinet_oauth_link")).toBeNull();
  });
});

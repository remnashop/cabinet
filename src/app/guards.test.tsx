import { act } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, it } from "vitest";

import { RequireAuth } from "@app/guards";
import { readStashedBotLinkToken } from "@features/auth/bot-signin-token";
import { clearAccessToken, setAccessToken } from "@shared/api/tokens";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => clearAccessToken());

it("sends a user whose session just ended to /login with the page they were on", async () => {
  setAccessToken({ access_token: "a1", expires_in: 900 });
  const router = createMemoryRouter(
    [
      { path: "/profile/payments", element: <RequireAuth><div>payments</div></RequireAuth> },
      { path: "/login", element: <div>login</div> },
    ],
    { initialEntries: ["/profile/payments?page=2"] },
  );
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<RouterProvider router={router} />));
  expect(container.textContent).toBe("payments");

  // what the http client does when a refresh is refused
  await act(async () => clearAccessToken());

  expect(router.state.location.pathname).toBe("/login");
  expect(router.state.location.search).toBe(`?next=${encodeURIComponent("/profile/payments?page=2")}`);
  act(() => root.unmount());
});

it("keeps the /link/bot token across the trip through /login", async () => {
  sessionStorage.clear();
  const token = "Ab3_-".repeat(9).slice(0, 43);
  const router = createMemoryRouter(
    [
      { path: "/link/bot", element: <RequireAuth><div>link</div></RequireAuth> },
      { path: "/login", element: <div>login</div> },
    ],
    { initialEntries: [`/link/bot#token=${token}`] },
  );
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<RouterProvider router={router} />));

  expect(router.state.location.search).toBe(`?next=${encodeURIComponent("/link/bot")}`);
  expect(readStashedBotLinkToken()).toBe(token);
  act(() => root.unmount());
});

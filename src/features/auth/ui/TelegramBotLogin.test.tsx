import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import "@shared/i18n";

import { TelegramBotLogin } from "./TelegramBotLogin";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;
let issued = 0;

beforeEach(() => {
  issued = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (!url.endsWith("/auth/telegram/deeplink")) return Response.json({ items: [], total: 0 });
      issued += 1;
      return Response.json({ bot_url: `https://t.me/shop_bot?start=webauth_${issued}`, expires_in: 300 });
    }),
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const button = (text: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;

it("asks the backend for a fresh bot link once the first one went stale", async () => {
  await act(async () => {
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <TelegramBotLogin />
      </QueryClientProvider>,
    );
  });
  const href = () => container.querySelector("a")?.getAttribute("href");
  await act(async () => button("Sign in with the Telegram bot").click());
  await vi.waitFor(() => expect(href()).toBe("https://t.me/shop_bot?start=webauth_1"));

  await act(async () => button("Get a new link").click());
  await vi.waitFor(() => expect(href()).toBe("https://t.me/shop_bot?start=webauth_2"));
  expect(issued).toBe(2);
});

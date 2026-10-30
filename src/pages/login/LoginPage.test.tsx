import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@shared/i18n";
import { tick, until } from "@shared/testing/until";

import { LoginPage } from "./LoginPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;

const doc = (kind: string, title: string) => ({ kind, title, body: "text", revision_id: 1 });

async function render(documents: object[], documentsFail = false, methods: object = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).includes("/legal/documents")
        ? documentsFail
          ? new Response("{}", { status: 500 })
          : Response.json({ items: documents, total: documents.length })
        : String(url).includes("/auth/email/verify")
          ? Response.json({ access_token: "a", expires_in: 900 })
          : Response.json({
            telegram_webapp: false,
            telegram_deeplink: false,
            email: true,
            oauth: [],
            allowed_email_domains: null,
            ...methods,
          }),
    ),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  // the sign-in methods and the legal documents load in parallel; a slow run takes longer than any fixed pause
  await until(() => expect(client.isFetching()).toBe(0));
  await tick();
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("LoginPage legal notice", () => {
  it("links only the visible documents", async () => {
    await render([doc("USER_AGREEMENT", "Terms"), doc("OFFER", "Offer")]);
    const links = [...container.querySelectorAll("button")].map((b) => b.textContent);
    expect(links.length).toBeGreaterThan(0);
    await until(() => expect(container.textContent).toMatch(/User agreement/i));
    expect(container.textContent).not.toMatch(/Privacy policy/i);
    expect(container.textContent).not.toMatch(/Offer/);
  });

  it("shows no line without documents", async () => {
    await render([]);
    expect(container.textContent).not.toMatch(/By continuing/);
  });

  async function verifyBody(documentsFail: boolean) {
    await render([doc("USER_AGREEMENT", "Terms")], documentsFail);
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    const type = async (value: string) => {
      const input = container.querySelector("input")!;
      await act(async () => {
        setValue.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };
    await type("a@b.co");
    await act(async () => container.querySelector("form")!.requestSubmit());
    // the email step fades out (StepTransition) before the code step mounts
    await until(() => expect(container.querySelector('input[autocomplete="one-time-code"]')).not.toBeNull());
    await type("123456");
    const verifyCall = () => vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/auth/email/verify"));
    await until(() => expect(verifyCall()).toBeDefined());
    return JSON.parse((verifyCall()![1] as RequestInit).body as string);
  }

  it("sends legal_locale with the email sign-in once the notice could be shown", async () => {
    expect(await verifyBody(false)).toMatchObject({ legal_locale: "en" });
  });

  it("sends no legal_locale when the documents failed to load", async () => {
    expect(await verifyBody(true)).not.toHaveProperty("legal_locale");
  });
});

describe("LoginPage Mini App only", () => {
  it("sends a browser to the bot when no other way in is on", async () => {
    await render([], false, { email: false, telegram_webapp: true, bot_username: "shop_bot" });
    expect(container.textContent).toContain(i18n.t("auth.miniAppOnly"));
    expect(container.querySelector("input")).toBeNull();
  });

  it("says sign-in is unavailable without the bot", async () => {
    await render([], false, { email: false, telegram_webapp: false, bot_username: null });
    expect(container.textContent).toContain(i18n.t("auth.unavailable"));
  });
});

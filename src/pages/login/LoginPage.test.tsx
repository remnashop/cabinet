import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "@shared/i18n";

import { LoginPage } from "./LoginPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;

const doc = (kind: string, title: string) => ({ kind, title, body: "text", revision_id: 1 });

async function render(documents: object[], documentsFail = false) {
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
  await act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
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
    console.log("HTML", container.innerHTML);
    const links = [...container.querySelectorAll("button")].map((b) => b.textContent);
    expect(links.length).toBeGreaterThan(0);
    expect(container.textContent).toMatch(/User agreement/i);
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
    await type("123456");
    await act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/auth/email/verify"))!;
    return JSON.parse((call[1] as RequestInit).body as string);
  }

  it("sends legal_locale with the email sign-in once the notice could be shown", async () => {
    expect(await verifyBody(false)).toMatchObject({ legal_locale: "en" });
  });

  it("sends no legal_locale when the documents failed to load", async () => {
    expect(await verifyBody(true)).not.toHaveProperty("legal_locale");
  });
});

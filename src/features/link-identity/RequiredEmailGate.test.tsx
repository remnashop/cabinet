import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@shared/i18n";

import { RequiredEmailGate } from "./RequiredEmailGate";

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@shared/api/http", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
}));
vi.mock("@features/auth/logout", () => ({ logout: vi.fn(async () => {}) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;

interface Answers {
  methods: object;
  email: string | null;
  pendingLegal?: number;
}

function answer({ methods, email, pendingLegal = 0 }: Answers) {
  api.apiGet.mockImplementation(async (path: string) => {
    if (path === "/auth/methods") return methods;
    if (path === "/users/me") return { email };
    if (path.startsWith("/cabinet/legal/pending"))
      return { items: Array.from({ length: pendingLegal }, (_, i) => ({ revision_id: i })), total: pendingLegal };
    throw new Error(`unexpected ${path}`);
  });
}

async function settle() {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <RequiredEmailGate />
      </QueryClientProvider>,
    );
  });
  await settle();
}

async function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const title = () => i18n.t("link.requiredTitle");
const required = { email_required: true };

describe("RequiredEmailGate", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    api.apiGet.mockReset();
    api.apiPost.mockReset();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("holds a customer without an email, with sign-out and no cancel", async () => {
    answer({ methods: required, email: null });
    await render();
    const buttons = [...document.body.querySelectorAll("button")].map((b) => b.textContent);
    expect(document.body.textContent).toContain(title());
    expect(buttons).toContain(i18n.t("common.logout"));
    expect(buttons).not.toContain(i18n.t("common.cancel"));
  });

  it("shows nothing once the customer has an email", async () => {
    answer({ methods: required, email: "a@b.c" });
    await render();
    expect(document.body.textContent).not.toContain(title());
  });

  it("shows nothing on a backend without the flag", async () => {
    answer({ methods: {}, email: null });
    await render();
    expect(document.body.textContent).not.toContain(title());
  });

  it("waits for pending documents first", async () => {
    answer({ methods: required, email: null, pendingLegal: 1 });
    await render();
    expect(document.body.textContent).not.toContain(title());
  });

  it("cannot be dismissed with Escape", async () => {
    answer({ methods: required, email: null });
    await render();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(document.body.textContent).toContain(title());
  });

  it("offers the merge when the address belongs to another account", async () => {
    answer({ methods: required, email: null });
    api.apiPost.mockImplementation(async (path: string) => {
      if (path.endsWith("/email/code")) return null;
      return {
        status: "merge_required",
        merge_token: "t",
        expires_in: 600,
        other: { subscriptions: 1, transactions: 0, referrals: 0, identities: [] },
      };
    });
    await render();

    await type(document.body.querySelector<HTMLInputElement>("input[type=email]")!, "a@b.c");
    await act(async () => document.body.querySelector("form")!.requestSubmit());
    // the code step comes in after the address step fades out
    const codeInput = await vi.waitFor(() => {
      const found = document.body.querySelector<HTMLInputElement>("input[autocomplete=one-time-code]");
      if (!found) throw new Error("no code input yet");
      return found;
    });
    await type(codeInput, "123456");
    await settle();

    expect(api.apiPost).toHaveBeenCalledWith("/users/me/identities/email/verify", { email: "a@b.c", code: "123456" });
    expect(document.body.textContent).toContain(i18n.t("link.mergeTitle"));
  });
});

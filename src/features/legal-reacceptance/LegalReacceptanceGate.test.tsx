import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@shared/i18n";
import { formatDate } from "@shared/lib/format";

import { LegalReacceptanceGate } from "./LegalReacceptanceGate";

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@shared/api/http", () => api);
vi.mock("@features/auth/logout", () => ({ logout: vi.fn(async () => {}) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const doc = (revision_id: number) => ({
  kind: "USER_AGREEMENT",
  title: "Agreement",
  body: "Text",
  revision_id,
  created_at: "2026-10-22T10:00:00Z",
});
const pending = (...ids: number[]) => ({ items: ids.map(doc), total: ids.length, is_update: true });

let root: ReturnType<typeof createRoot>;
let container: HTMLElement;

async function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <LegalReacceptanceGate />
      </QueryClientProvider>,
    );
  });
  // the query resolves after the first render
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

function button(text: string): HTMLButtonElement {
  const found = [...document.body.querySelectorAll("button")].find((b) => b.textContent === text);
  if (!found) throw new Error(`no button ${text}`);
  return found;
}

const title = () => i18n.t("legal.reaccept.title");

describe("LegalReacceptanceGate", () => {
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

  it("shows nothing when no documents are pending", async () => {
    api.apiGet.mockResolvedValue(pending());
    await render();
    expect(document.body.textContent).not.toContain(title());
  });

  it("shows the pending document and accepts it", async () => {
    api.apiGet.mockResolvedValueOnce(pending(5)).mockResolvedValue(pending());
    api.apiPost.mockResolvedValue(pending());
    await render();
    expect(document.body.textContent).toContain(title());
    expect(document.body.textContent).toContain("Agreement");
    expect(document.body.textContent).toContain(
      i18n.t("legal.reaccept.revision", { date: formatDate("2026-10-22T10:00:00Z", i18n.language) }),
    );

    await act(async () => button(i18n.t("legal.reaccept.accept")).click());

    expect(api.apiPost).toHaveBeenCalledWith("/cabinet/legal/actions/accept", {
      locale: expect.any(String),
      revision_ids: [5],
    });
    expect(document.body.textContent).not.toContain(title());
  });

  it("re-shows the fresh revision when the server returns one", async () => {
    api.apiGet.mockResolvedValue(pending(5));
    api.apiPost.mockResolvedValueOnce(pending(9)).mockResolvedValue(pending());
    await render();

    await act(async () => button(i18n.t("legal.reaccept.accept")).click());
    expect(document.body.textContent).toContain(title());
    await act(async () => button(i18n.t("legal.reaccept.accept")).click());

    expect(api.apiPost).toHaveBeenLastCalledWith("/cabinet/legal/actions/accept", {
      locale: expect.any(String),
      revision_ids: [9],
    });
  });

  it("cannot be dismissed with Escape", async () => {
    api.apiGet.mockResolvedValue(pending(5));
    await render();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(document.body.textContent).toContain(title());
  });
});

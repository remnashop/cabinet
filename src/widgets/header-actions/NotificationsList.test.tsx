import { QueryClient, QueryClientProvider, type UseQueryResult } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { expect, it, vi } from "vitest";

import type { NotificationFeed } from "@entities/notification/api";
import i18n from "@shared/i18n";

import { NotificationsList } from "./NotificationsList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const feed: NotificationFeed = {
  unread_count: 1,
  items: [
    { id: 2, event_type: "X", title: "Paid", body: "Plan renewed", url: "/profile/payments", created_at: new Date().toISOString(), read: false },
    { id: 1, event_type: "X", title: "Welcome", body: "Hello", url: "/", created_at: "2026-10-01T10:00:00Z", read: true },
  ],
};

function Where() {
  const { pathname, search } = useLocation();
  return <span data-testid="where">{pathname + search}</span>;
}

const client = new QueryClient();
// the feed's rows, not the header's clear button
const firstRow = (container: HTMLElement) => container.querySelector(".list-rows button") as HTMLButtonElement;

async function mount(query: Record<string, unknown>, onClose = vi.fn(), onSupport?: () => void) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/start"]}>
          <NotificationsList feed={query as unknown as UseQueryResult<NotificationFeed>} onClose={onClose} onSupport={onSupport} />
          <Where />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
  return { container, onClose, done: () => { act(() => root.unmount()); container.remove(); } };
}

it("renders title, body and time, with a dot on unread rows only", async () => {
  const { container, done } = await mount({ data: feed });
  const rows = [...container.querySelectorAll(".list-rows button")];
  expect(rows).toHaveLength(2);
  expect(rows[0]!.textContent).toContain("Paid");
  expect(rows[0]!.textContent).toContain("Plan renewed");
  expect(rows[1]!.textContent).toContain("Welcome");
  expect(rows[0]!.querySelector("[data-unread]")).not.toBeNull();
  expect(rows[1]!.querySelector("[data-unread]")).toBeNull();
  done();
});

it("a row navigates to its url and closes the popover", async () => {
  const { container, onClose, done } = await mount({ data: feed });
  await act(async () => firstRow(container).click());
  expect(container.querySelector("[data-testid=where]")!.textContent).toBe("/profile/payments");
  expect(onClose).toHaveBeenCalledOnce();
  done();
});

it("an empty feed says so", async () => {
  const { container, done } = await mount({ data: { items: [], unread_count: 0 } });
  expect(container.textContent).toContain(i18n.t("header.notificationsEmpty"));
  done();
});

it("a failed load offers a retry", async () => {
  const refetch = vi.fn();
  const { container, done } = await mount({ isError: true, error: new Error("x"), refetch });
  const retry = [...container.querySelectorAll("button")].find((b) => b.textContent === i18n.t("common.retry"))!;
  await act(async () => retry.click());
  expect(refetch).toHaveBeenCalledOnce();
  done();
});

const withSupport = (url: string): NotificationFeed => ({ unread_count: 0, items: [{ ...feed.items[0]!, url }] });

it("a support link drops the param from the route and opens support in the same click", async () => {
  const onSupport = vi.fn();
  const { container, done } = await mount({ data: withSupport("/profile?support=1&a=2") }, vi.fn(), onSupport);
  await act(async () => firstRow(container).click());
  expect(container.querySelector("[data-testid=where]")!.textContent).toBe("/profile?a=2");
  expect(onSupport).toHaveBeenCalledOnce();
  done();
});

it("a support link without support configured only navigates", async () => {
  const { container, done } = await mount({ data: withSupport("/profile?support=1") });
  await act(async () => firstRow(container).click());
  expect(container.querySelector("[data-testid=where]")!.textContent).toBe("/profile");
  done();
});

it("clear empties the feed at once and asks the server to", async () => {
  const fetch = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  client.setQueryData(["notifications"], feed);
  const { container, done } = await mount({ data: feed });
  const clear = [...container.querySelectorAll("button")].find((b) => b.textContent === i18n.t("header.clear"))!;
  await act(async () => clear.click());
  expect(client.getQueryData(["notifications"])).toEqual({ items: [], unread_count: 0 });
  expect(String((fetch.mock.calls[0] as unknown[])[0])).toBe("/api/notifications/me/actions/clear");
  vi.unstubAllGlobals();
  done();
});

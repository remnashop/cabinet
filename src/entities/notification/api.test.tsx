import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import { useMarkNotificationsRead, type NotificationFeed } from "@entities/notification/api";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.unstubAllGlobals());

it("marking read zeroes the counter but keeps each item's read flag until the popover closes", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const feed: NotificationFeed = {
    items: [{ id: 1, event_type: "X", title: "t", body: "b", url: "/", created_at: "2026-10-30T10:00:00Z", read: false }],
    unread_count: 1,
  };
  client.setQueryData(["notifications"], feed);

  function Probe() {
    const { mutate } = useMarkNotificationsRead();
    useEffect(() => mutate(), [mutate]);
    return null;
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
  });

  await vi.waitFor(() => expect(client.getQueryData<NotificationFeed>(["notifications"])?.unread_count).toBe(0));
  expect(client.getQueryData<NotificationFeed>(["notifications"])?.items[0]?.read).toBe(false);
  act(() => root.unmount());
});

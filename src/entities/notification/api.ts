import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPost } from "@shared/api/http";
import type { PushApi } from "@shared/lib/push";

export interface CustomerNotification {
  id: number;
  event_type: string;
  title: string;
  body: string;
  url: string;
  created_at: string;
  read: boolean;
}

export interface NotificationFeed {
  items: CustomerNotification[];
  unread_count: number;
}

const KEY = ["notifications"];

export function useNotificationsQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => apiGet<NotificationFeed>("/notifications/me", signal),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

/** The counter drops at once; the items keep their flags, so the dots stay until the popover closes. */
export function useMarkNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<void, Record<string, never>>("/notifications/me/actions/mark-read", {}),
    onSuccess: () =>
      client.setQueryData<NotificationFeed>(KEY, (feed) => (feed ? { ...feed, unread_count: 0 } : feed)),
  });
}

export const pushApi: PushApi = {
  getPublicKey: async () =>
    (await apiGet<{ public_key: string | null }>("/notifications/me/push/public-key")).public_key,
  subscribe: (body) => apiPost("/notifications/me/push-subscriptions", body),
  listEndpoints: async () =>
    (await apiGet<{ items: { id: number; endpoint: string }[] }>("/notifications/me/push-subscriptions")).items.map(
      ({ id, endpoint }) => ({ id, endpoint }),
    ),
  remove: (id) => apiDelete(`/notifications/me/push-subscriptions/${id}`),
};

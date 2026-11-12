import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPost } from "@shared/api/http";

export type SubscriptionStatus = "ACTIVE" | "LIMITED" | "EXPIRED" | "DISABLED" | "DELETED";

export interface OwnSubscription {
  id: number;
  status: SubscriptionStatus;
  is_trial: boolean;
  expire_at: string;
  url: string;
  // whole GB, 0 = unlimited
  effective_traffic_limit: number;
  effective_device_limit: number;
  traffic_limit_strategy: string;
  plan_name: string;
  plan_id: number;
  // the terms it was sold with: a paid renewal moves it to the plan's current ones
  plan_traffic_limit: number;
  plan_device_limit: number;
  plan_traffic_limit_strategy: string;
  // bytes, null = unknown
  used_traffic: number | null;
  // the last "delete all devices", what the shop's cooldown counts from
  device_all_reset_at: string | null;
  link_reset_at: string | null;
  // the backend's signature over url: what the connect page's browser hop is vouched for with
  connect_signature: string;
}

export interface Trial {
  is_available: boolean;
  plan_id: number | null;
  plan_name: string | null;
  duration_days: number | null;
  // a paid trial isn't activated: it's bought at checkout by plan_id, its one duration priced below
  is_free: boolean;
  price: string | null;
  currency: string | null;
  prices: { currency: string; price: string }[];
}

export interface Device {
  hwid: string;
  platform: string | null;
  device_model: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useSubscriptionsQuery() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: ({ signal }) => apiGet<{ items: OwnSubscription[]; total: number }>("/subscriptions/me", signal),
  });
}

export function useTrialQuery() {
  return useQuery({
    queryKey: ["trial"],
    queryFn: ({ signal }) => apiGet<Trial>("/subscriptions/me/trial", signal),
  });
}

export function useDevicesQuery(subscriptionId: number | null) {
  return useQuery({
    queryKey: ["devices", subscriptionId],
    queryFn: ({ signal }) =>
      apiGet<{ items: Device[]; total: number }>(`/subscriptions/me/${subscriptionId}/devices`, signal),
    enabled: subscriptionId !== null,
  });
}

// the device count and the link live on the subscription too, so both caches go stale
function useSubscriptionMutation<V extends { subscriptionId: number }>(fn: (variables: V) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_data, { subscriptionId }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: ["subscriptions"] }),
        client.invalidateQueries({ queryKey: ["devices", subscriptionId] }),
      ]),
  });
}

export function useDeleteDevice() {
  return useSubscriptionMutation(({ subscriptionId, hwid }: { subscriptionId: number; hwid: string }) =>
    apiDelete(`/subscriptions/me/${subscriptionId}/devices/${encodeURIComponent(hwid)}`),
  );
}

export function useDeleteAllDevices() {
  return useSubscriptionMutation(({ subscriptionId }: { subscriptionId: number }) =>
    apiPost(`/subscriptions/me/${subscriptionId}/devices/bulk/delete`, {}),
  );
}

export function useReissue() {
  return useSubscriptionMutation(({ subscriptionId }: { subscriptionId: number }) =>
    apiPost(`/subscriptions/me/${subscriptionId}/actions/reissue`, {}),
  );
}

export function useActivateTrial() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<OwnSubscription, object>("/subscriptions/me/actions/activate-trial", {}),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ["subscriptions"] }),
        client.invalidateQueries({ queryKey: ["trial"] }),
      ]),
  });
}

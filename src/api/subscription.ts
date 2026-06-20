import { api } from "@/api/client";
import type { components } from "@/api-types";

export type Subscription = components["schemas"]["SubscriptionInfoResponse"];

export const subscriptionApi = {
  async current(): Promise<Subscription | null> {
    const { data } = await api.get<Subscription | null>("/subscription/current");
    return data ?? null;
  },
};

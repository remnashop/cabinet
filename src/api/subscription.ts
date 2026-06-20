import { api } from "@/api/client";
import type { components } from "@/api-types";

export type Subscription = components["schemas"]["SubscriptionInfoResponse"];
export type Offers = components["schemas"]["SubscriptionOffersResponse"];
export type PlanOffer = components["schemas"]["PlanOfferResponse"];
export type DurationOffer = components["schemas"]["DurationOfferResponse"];
export type GatewayPrice = components["schemas"]["DurationGatewayPriceResponse"];
export type PaymentInit = components["schemas"]["PaymentInitResponse"];
type PaymentGatewayType = components["schemas"]["PaymentGatewayType"];

export const subscriptionApi = {
  async current(): Promise<Subscription | null> {
    const { data } = await api.get<Subscription | null>("/subscription/current");
    return data ?? null;
  },
  async offers(): Promise<Offers> {
    const { data } = await api.get<Offers>("/subscription/offers");
    return data;
  },
  async purchase(
    planCode: string,
    durationDays: number,
    gateway: PaymentGatewayType,
  ): Promise<PaymentInit> {
    const { data } = await api.post<PaymentInit>("/subscription/purchase", {
      plan_code: planCode,
      duration_days: durationDays,
      gateway_type: gateway,
    });
    return data;
  },
  async extend(durationDays: number, gateway: PaymentGatewayType): Promise<PaymentInit> {
    const { data } = await api.post<PaymentInit>("/subscription/extend", {
      duration_days: durationDays,
      gateway_type: gateway,
    });
    return data;
  },
  async activatePromocode(code: string): Promise<components["schemas"]["PromocodeActivateResponse"]> {
    const { data } = await api.post<components["schemas"]["PromocodeActivateResponse"]>(
      "/subscription/promocode",
      { code },
    );
    return data;
  },
  async activateTrial(): Promise<void> {
    await api.post("/subscription/trial");
  },
};

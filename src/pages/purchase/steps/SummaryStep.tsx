import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { createCheckout, useQuoteQuery, type PaymentMethod, type Plan } from "@entities/plan/api";
import { useMeQuery } from "@entities/session/api";
import { StarsInvoiceError, UnsafePaymentUrlError } from "@features/payment/start-payment";
import { durationUnit, gatewayLabel, isValidEmail, type PurchaseType } from "@features/purchase/wizard";
import { getErrorMessage } from "@shared/api/http";
import { formatMoney } from "@shared/lib/format";
import { haptic } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { InfoRow } from "@shared/ui/InfoRow";
import { Skeleton } from "@shared/ui/Skeleton";
import { TextInput } from "@shared/ui/TextInput";

type CheckoutResult = Awaited<ReturnType<typeof createCheckout>>;

export function SummaryStep({
  plan,
  days,
  method,
  type,
  subId,
  typedEmail,
  onEmailChange,
  onCreated,
}: {
  plan: Plan;
  days: number;
  method: PaymentMethod;
  type: PurchaseType;
  subId: number | null;
  /** owned by the wizard so a step back and forth keeps what was typed */
  typedEmail: string | null;
  onEmailChange: (value: string) => void;
  onCreated: (result: CheckoutResult) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const me = useMeQuery();
  // the total always comes from the backend's quote, never from the catalog prices
  const quote = useQuoteQuery({
    plan_id: plan.id,
    duration_days: days,
    currency: method.currency,
  });
  const queryClient = useQueryClient();
  const checkout = useMutation({
    mutationFn: createCheckout,
    onSuccess: onCreated,
    // an attempt may spend a one-time discount: the next total must come from a fresh quote
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["quote"] }),
  });
  // null until the user types: the field follows me.email even if it loads after mount
  const email = (typedEmail ?? me.data?.email ?? "").trim();
  const emailInvalid = email !== "" && !isValidEmail(email);
  const emailOk = email ? !emailInvalid : !method.requires_email;
  const { unit, count } = durationUnit(days);
  const amount = quote.data ? formatMoney(quote.data.final_price, quote.data.currency, locale) : null;

  // isPending only lands on the next render: two taps in one frame would create two orders
  const inFlight = useRef(false);
  const pay = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    haptic();
    checkout.mutate(
      {
        plan_id: plan.id,
        duration_days: days,
        currency: method.currency,
        purchase_type: type,
        gateway_type: method.gateway_type,
        ...(subId !== null && { target_subscription_id: subId }),
        ...(email && { customer_email: email }),
      },
      { onError: () => (inFlight.current = false) },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Card variant="list">
        <InfoRow label={t("purchase.plan")} value={plan.name} />
        <InfoRow label={t("purchase.duration")} value={t(`purchase.${unit}`, { count })} />
        <InfoRow label={t("purchase.method")} value={gatewayLabel(method.gateway_type)} />
        {quote.data && quote.data.plan_discount_percent > 0 && (
          <InfoRow
            label={t("purchase.planDiscount")}
            value={<span className="text-success">−{quote.data.plan_discount_percent}%</span>}
          />
        )}
        {quote.data && quote.data.discount_percent > 0 && (
          <InfoRow
            label={t("purchase.discount")}
            value={
              <span className="text-success">
                {t("purchase.discountValue", {
                  percent: quote.data.discount_percent,
                  source: t(`purchase.discountSource.${quote.data.discount_source}`),
                })}
              </span>
            }
          />
        )}
        <div className="mt-1 flex items-center justify-between border-t border-border px-2.5 pb-1.5 pt-2.5 text-[15px] font-bold">
          <span>{t("purchase.total")}</span>
          {amount ?? (quote.isError ? "—" : <Skeleton className="h-5 w-20" />)}
        </div>
      </Card>

      <Card
        variant="form"
        title={method.requires_email ? t("purchase.email") : t("purchase.emailOptional")}
        titleFor="receipt-email"
      >
        <TextInput
          id="receipt-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={typedEmail ?? me.data?.email ?? ""}
          onChange={(e) => onEmailChange(e.target.value)}
          aria-invalid={emailInvalid}
          required={method.requires_email}
          className="w-full"
        />
        {emailInvalid && <p className="text-xs text-error">{t("purchase.emailInvalid")}</p>}
      </Card>

      {quote.isError && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-error">{getErrorMessage(quote.error, t("errors.generic"))}</p>
          <Button variant="outline" className="shrink-0" onClick={() => void quote.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      )}
      {checkout.isError && (
        <p className="text-sm text-error">
          {checkout.error instanceof StarsInvoiceError
            ? t(`payment.stars.${checkout.error.outcome}`)
            : checkout.error instanceof UnsafePaymentUrlError
              ? t("payment.unsafeUrl")
              : getErrorMessage(checkout.error, t("errors.generic"))}
        </p>
      )}
      {/* isSuccess too: the page is leaving for the gateway, a second click would open a second order */}
      <Button
        variant="solid"
        disabled={!quote.data || quote.isFetching || !emailOk || checkout.isPending || checkout.isSuccess}
        onClick={pay}
      >
        {t("purchase.pay", { amount: amount ?? "…" })}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">{t("purchase.payNote")}</p>
    </div>
  );
}

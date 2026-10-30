import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { CreditCard, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { createCheckout, useQuoteQuery, type PaymentMethod, type Plan, type PlanAccess } from "@entities/plan/api";
import { useShownLegalLocale } from "@entities/legal/api";
import { LegalNotice } from "@entities/legal/LegalNotice";
import { useMeQuery } from "@entities/session/api";
import { AwaitPaymentButton } from "@features/payment/AwaitPaymentButton";
import { StarsInvoiceError, UnsafePaymentUrlError } from "@features/payment/start-payment";
import { gatewayLabel, isValidEmail, type PurchaseType } from "@features/purchase/wizard";
import { getErrorMessage } from "@shared/api/http";
import { formatMoney } from "@shared/lib/format";
import { haptic } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { InfoRow } from "@shared/ui/InfoRow";
import { TextInput } from "@shared/ui/TextInput";
import { FormError } from "@shared/ui/FormError";

type CheckoutResult = Awaited<ReturnType<typeof createCheckout>>;

export function SummaryStep({
  plan,
  days,
  method,
  type,
  subId,
  access,
  typedEmail,
  onEmailChange,
  onCreated,
}: {
  plan: Plan;
  days: number;
  method: PaymentMethod;
  type: PurchaseType;
  subId: number | null;
  access: PlanAccess;
  /** owned by the wizard so a step back and forth keeps what was typed */
  typedEmail: string | null;
  onEmailChange: (value: string) => void;
  /** opens the payment; resolves to the order to wait for here (the Mini App), null when the page moved on */
  onCreated: (result: CheckoutResult) => Promise<number | null>;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const me = useMeQuery();
  // the total always comes from the backend's quote, never from the catalog prices
  const quote = useQuoteQuery({
    plan_id: plan.id,
    duration_days: days,
    currency: method.currency,
    ...access,
  });
  const queryClient = useQueryClient();
  // the Mini App's order paid beside it: the button waits for it; why the last wait ended, if not by a tap
  const [awaited, setAwaited] = useState<number | null>(null);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const checkout = useMutation({
    mutationFn: createCheckout,
    onSuccess: async (result) => setAwaited(await onCreated(result)),
    // an attempt may spend a one-time discount: the next total must come from a fresh quote
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["quote"] }),
  });
  // null until the user types: the field follows me.email even if it loads after mount
  const email = (typedEmail ?? me.data?.email ?? "").trim();
  const emailInvalid = email !== "" && !isValidEmail(email);
  const emailOk = email ? !emailInvalid : !method.requires_email;
  const amount = quote.data ? formatMoney(quote.data.final_price, quote.data.currency, locale) : null;

  const legal = useShownLegalLocale();

  // isPending only lands on the next render: two taps in one frame would create two orders
  const inFlight = useRef(false);
  const pay = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    haptic();
    setStopReason(null);
    checkout.mutate(
      {
        plan_id: plan.id,
        duration_days: days,
        currency: method.currency,
        purchase_type: type,
        gateway_type: method.gateway_type,
        ...(quote.data && { expected_price: quote.data.final_price }),
        ...(legal && { legal_locale: legal }),
        ...(subId !== null && { target_subscription_id: subId }),
        ...(access.plan_code && { plan_code: access.plan_code }),
        ...(email && { customer_email: email }),
      },
      { onError: () => (inFlight.current = false) },
    );
  };
  // back to "pay": a new tap opens a new order
  const stopWaiting = useCallback(
    (reason: string | null) => {
      setAwaited(null);
      setStopReason(reason);
      checkout.reset();
      inFlight.current = false;
    },
    [checkout],
  );

  // isSuccess too: the page is leaving for the gateway, a second click would open a second order
  const canPay =
    awaited === null && !!quote.data && !quote.isFetching && emailOk && !checkout.isPending && !checkout.isSuccess;

  return (
    // a form: Enter in the email field pays; noValidate keeps the browser's bubble out, the field says it itself
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canPay) pay();
      }}
    >
      {me.data && !me.data.email && (
        <Card variant="bare" round>
          <div className="flex flex-col gap-3 p-[13px]">
            <InfoRow
              icon={method.gateway_type === "TELEGRAM_STARS" ? Star : CreditCard}
              label={t("purchase.method")}
              value={gatewayLabel(method.gateway_type, t)}
              bright
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="receipt-email" className="px-[13px] text-[12px] text-foreground">
                {t("purchase.email")}
              </label>
              <TextInput
                id="receipt-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={typedEmail ?? ""}
                onChange={(e) => onEmailChange(e.target.value)}
                aria-invalid={emailInvalid}
                required={method.requires_email}
                className="w-full"
              />
              {emailInvalid && <FormError className="px-[13px]">{t("purchase.emailInvalid")}</FormError>}
            </div>
          </div>
        </Card>
      )}

      {quote.isError && (
        <div className="flex items-center justify-between gap-3">
          <FormError>{getErrorMessage(quote.error, t("errors.generic"))}</FormError>
          <Button variant="outline" className="shrink-0" onClick={() => void quote.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      )}
      {checkout.isError && (
        <FormError>
          {checkout.error instanceof StarsInvoiceError
            ? t(`payment.stars.${checkout.error.outcome}`)
            : checkout.error instanceof UnsafePaymentUrlError
              ? t("payment.unsafeUrl")
              : getErrorMessage(checkout.error, t("errors.generic"))}
        </FormError>
      )}
      {stopReason && <FormError>{stopReason}</FormError>}
      <div className="flex flex-col gap-2">
        {awaited !== null ? (
          <AwaitPaymentButton key={awaited} orderId={awaited} onStop={stopWaiting} />
        ) : (
          <Button type="submit" variant="solid" size="lg" disabled={!canPay}>
            {t("purchase.pay", { amount: amount ?? "…" })}
          </Button>
        )}
        <LegalNotice kinds={["OFFER"]} message="payNotice" />
      </div>
    </form>
  );
}

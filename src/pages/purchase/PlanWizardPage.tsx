import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { useCatalogQuery, usePaymentMethodsQuery, type PaymentMethod, type Plan } from "@entities/plan/api";
import { useTrialQuery, type Trial } from "@entities/subscription/api";
import { startPayment } from "@features/payment/start-payment";
import { parseWizardParams } from "@features/purchase/wizard";
import { ButtonLink } from "@shared/ui/ButtonLink";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { PageEmpty } from "@shared/ui/PageEmpty";
import { Skeleton } from "@shared/ui/Skeleton";
import { StepTransition } from "@shared/ui/StepTransition";
import { PageHeader } from "@widgets/page-header/PageHeader";

import { DurationStep } from "./steps/DurationStep";
import { MethodStep } from "./steps/MethodStep";
import { SummaryStep } from "./steps/SummaryStep";
import { WizardHead } from "./WizardHead";

/** A paid trial as a plan: the catalog leaves trials out, its one duration comes priced with the trial. */
function trialPlan(trial: Trial | undefined, planId: number): Plan | undefined {
  if (!trial?.is_available || trial.is_free || trial.plan_id !== planId || !trial.duration_days) return undefined;
  return {
    id: planId,
    name: trial.plan_name ?? "",
    description: null,
    badge: null,
    type: "BOTH",
    traffic_limit: 0,
    device_limit: 0,
    is_trial: true,
    order_index: 0,
    durations: [{ days: trial.duration_days, order_index: 0, prices: trial.prices }],
  };
}

export function PlanWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const planId = Number(useParams().planId);
  const [search] = useSearchParams();
  const { type, subId, access } = parseWizardParams(search);
  const catalog = useCatalogQuery(access);
  const trial = useTrialQuery();
  const methods = usePaymentMethodsQuery();
  // ?days= (buying again after a failed payment): the duration is taken, the wizard opens on the method
  const [chosenDays, setDays] = useState<number | null>(() => Number(search.get("days")) || null);
  const [chosenStep, setStep] = useState<0 | 1 | 2>(() => (search.get("days") ? 1 : 0));
  const [chosenMethod, setMethod] = useState<PaymentMethod | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // RENEW comes straight from the home card, and the catalog has nothing to renew into; a plan link's page
  // would send the user straight back here, so it leaves for the catalog
  const exitTo = type === "RENEW" ? "/" : type === "CHANGE" ? `/purchase?type=CHANGE&sub=${subId}` : "/purchase";
  const catalogPlan = catalog.data?.items.find((p) => p.id === planId);
  const trialOffer = catalogPlan ? undefined : trialPlan(trial.data, planId);
  const plan = catalogPlan ?? trialOffer;
  // one method is no choice: it's taken, and the wizard skips its step
  const onlyMethod = methods.data?.items.length === 1 ? methods.data.items[0] : null;
  const method = chosenMethod ?? onlyMethod;
  const skipMethod = onlyMethod !== null;
  // a trial has one duration: it's taken, the wizard opens on the method (the summary with the method taken), and back
  // from there leaves for home
  const isTrial = trialOffer !== undefined;
  const firstStep = isTrial ? (skipMethod ? 2 : 1) : 0;
  // a duration the plan no longer sells is no choice: back to picking one
  const days = (plan?.durations.some((d) => d.days === chosenDays) ? chosenDays : null) ?? trialOffer?.durations[0].days ?? null;
  const step = (days === null ? 0 : Math.max(chosenStep === 1 && skipMethod ? 2 : chosenStep, firstStep)) as 0 | 1 | 2;

  const onBack = useCallback(() => {
    if (step === firstStep) void navigate(isTrial ? "/" : exitTo, { replace: true });
    else setStep(step === 2 && skipMethod ? 0 : ((step - 1) as 0 | 1));
  }, [step, firstStep, isTrial, skipMethod, exitTo, navigate]);

  // every step says what's going on (a purchase, a renewal, a change); the plan's name is on the card under it
  const title = plan ? t(`purchase.titles.${type}`) : t("pages.purchase");
  const desktopTitle = plan ? t(`purchase.titlesFull.${type}`) : undefined;
  const header = <PageHeader title={title} desktopTitle={desktopTitle} onBack={onBack} />;

  if (catalog.isError && !catalog.data) {
    return (
      <>
        {header}
        <ErrorCard round error={catalog.error} onRetry={() => void catalog.refetch()} />
      </>
    );
  }
  // a plan the catalog lacks may be the paid trial: wait for that answer too
  if (!catalog.data || (!catalogPlan && trial.isPending)) {
    return (
      <>
        {header}
        <Skeleton round className="h-64" />
      </>
    );
  }
  if (!plan) {
    return (
      <>
        {header}
        <PageEmpty warning text={t("purchase.planNotFound")}>
          <ButtonLink to={exitTo} variant="outline" className="mt-1">
            {type === "RENEW" ? t("common.home") : t("purchase.toCatalog")}
          </ButtonLink>
        </PageEmpty>
      </>
    );
  }

  return (
    <>
      {header}
      <WizardHead
        plan={plan}
        step={step}
        days={days}
        method={method}
        currency={catalog.data.anchor_currency}
        access={access}
        skipMethod={skipMethod}
        onStep={(s) => setStep(Math.max(s, firstStep) as 0 | 1)}
      />
      <StepTransition stepKey={step}>
        {step === 0 && (
          <DurationStep
            plan={plan}
            currency={catalog.data.anchor_currency}
            type={type}
            access={access}
            onSelect={(d) => {
              setDays(d);
              setStep(skipMethod ? 2 : 1);
            }}
          />
        )}
        {step === 1 && days !== null && (
          <MethodStep
            plan={plan}
            days={days}
            access={access}
            onSelect={(m) => {
              setMethod(m);
              setStep(2);
            }}
          />
        )}
        {step === 2 && days !== null && method !== null && (
          <SummaryStep
            plan={plan}
            days={days}
            method={method}
            type={type}
            subId={subId}
            access={access}
            typedEmail={email}
            onEmailChange={setEmail}
            onCreated={(result) => startPayment(result, method.gateway_type, navigate)}
          />
        )}
      </StepTransition>
    </>
  );
}

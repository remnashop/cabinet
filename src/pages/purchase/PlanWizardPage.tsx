import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

import { useCatalogQuery, type PaymentMethod } from "@entities/plan/api";
import { startPayment } from "@features/payment/start-payment";
import { parseWizardParams } from "@features/purchase/wizard";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

import { DurationStep } from "./steps/DurationStep";
import { MethodStep } from "./steps/MethodStep";
import { SummaryStep } from "./steps/SummaryStep";

const STEP_TITLES = ["purchase.stepDuration", "purchase.stepMethod", "purchase.stepSummary"] as const;

export function PlanWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const planId = Number(useParams().planId);
  const [search] = useSearchParams();
  const { type, subId } = parseWizardParams(search);
  const catalog = useCatalogQuery();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [days, setDays] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // RENEW comes straight from the home card, and the catalog has nothing to renew into
  const exitTo = type === "RENEW" ? "/" : type === "CHANGE" ? `/purchase?type=CHANGE&sub=${subId}` : "/purchase";
  const onBack = useCallback(() => {
    if (step === 0) void navigate(exitTo, { replace: true });
    else setStep((step - 1) as 0 | 1);
  }, [step, exitTo, navigate]);

  const plan = catalog.data?.items.find((p) => p.id === planId);
  const header = <PageHeader title={plan?.name ?? t("pages.purchase")} onBack={onBack} />;

  if (catalog.isError) {
    return (
      <>
        {header}
        <ErrorCard onRetry={() => void catalog.refetch()} />
      </>
    );
  }
  if (!catalog.data) {
    return (
      <>
        {header}
        <Skeleton className="h-64" />
      </>
    );
  }
  if (!plan) {
    return (
      <>
        {header}
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">{t("purchase.planNotFound")}</p>
          <Link to={exitTo} className="text-sm text-primary">
            {t("purchase.toCatalog")}
          </Link>
        </Card>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="mb-4 flex gap-1.5">
        {STEP_TITLES.map((key, i) => (
          <div key={key} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-white/[0.08]"}`} />
        ))}
      </div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t(STEP_TITLES[step])}
      </h2>
      {step === 0 && (
        <DurationStep
          plan={plan}
          currency={catalog.data.anchor_currency}
          selected={days}
          onSelect={(d) => {
            setDays(d);
            setStep(1);
          }}
        />
      )}
      {step === 1 && days !== null && (
        <MethodStep
          plan={plan}
          days={days}
          selected={method}
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
          typedEmail={email}
          onEmailChange={setEmail}
          onCreated={(result) => startPayment(result, method.gateway_type, navigate)}
        />
      )}
    </>
  );
}

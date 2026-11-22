import { useMutation } from "@tanstack/react-query";
import { House, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { joinPaymentWaitlist } from "@entities/plan/api";
import { ButtonLink } from "@shared/ui/ButtonLink";
import { PageEmpty } from "@shared/ui/PageEmpty";

export function WarningBanner({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-warning/30 bg-linear-to-r from-warning/[0.12] to-warning/[0.03] p-5 lg:p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
        <TriangleAlert className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-base font-bold text-warning">{title}</h2>
        <span className="text-xs text-foreground">{hint}</span>
      </div>
    </div>
  );
}

// seeing the catalog or a plan while payments are off is wanting to buy: the user goes on the waitlist and hears once
// they're back
function useJoinWaitlist() {
  const { mutate } = useMutation({ mutationFn: joinPaymentWaitlist });
  useEffect(() => mutate(), [mutate]);
}

export function PaymentsOffBanner() {
  const { t } = useTranslation();
  useJoinWaitlist();
  return <WarningBanner title={t("purchase.paymentsOffTitle")} hint={t("purchase.paymentsOffHint")} />;
}

// the wizard in its place: every checkout is refused, a free one too
export function PaymentsOffScreen() {
  const { t } = useTranslation();
  useJoinWaitlist();
  return (
    <PageEmpty warning title={t("purchase.paymentsOffTitle")} text={t("purchase.paymentsOffHint")}>
      <ButtonLink to="/" variant="glassSolid" size="lg" className="w-full">
        <House className="size-5" />
        {t("common.home")}
      </ButtonLink>
    </PageEmpty>
  );
}

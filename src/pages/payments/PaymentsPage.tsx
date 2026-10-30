import { ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { getTransaction, useTransactionsInfinite, type Transaction } from "@entities/transaction/api";
import { durationLabel, gatewayLabel } from "@features/purchase/wizard";
import { currencySymbol, formatDate, formatMoney } from "@shared/lib/format";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EventIcon, EventList, EventRow } from "@shared/ui/EventList";
import { LoadMore } from "@shared/ui/LoadMore";
import { PageEmpty } from "@shared/ui/PageEmpty";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

import { PaymentDetailsSheet } from "./PaymentDetailsSheet";
import { hasDiscount } from "./discount";
import { STATUS_ICON_TONE } from "./status-tone";

export function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const query = useTransactionsInfinite();
  const [selected, setSelected] = useState<Transaction | null>(null);
  // a notification link (`?id=`) opens that payment; a missing one leaves just the list
  const [params, setParams] = useSearchParams();
  const linkedId = params.get("id");
  useEffect(() => {
    if (!linkedId) return;
    getTransaction(linkedId).then(setSelected, () => {});
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete("id");
        return next;
      },
      { replace: true },
    );
  }, [linkedId, setParams]);

  const header = <PageHeader title={t("pages.payments")} backTo="/profile" />;
  if (query.isError && !query.data) {
    return (
      <>
        {header}
        <ErrorCard round error={query.error} onRetry={() => void query.refetch()} />
      </>
    );
  }
  if (!query.data) {
    return (
      <>
        {header}
        <Skeleton round className="h-64" />
      </>
    );
  }

  // offset pages shift when a new payment lands between fetches: the same row can come back on the next page
  const items = [...new Map(query.data.pages.flatMap((page) => page.items).map((tx) => [tx.id, tx])).values()];
  if (!items.length) {
    return (
      <>
        {header}
        <PageEmpty icon={ReceiptText} text={t("payments.empty")} />
      </>
    );
  }

  return (
    <>
      {header}
      <Card round>
        <EventList>
          {items.map((tx) => (
            <EventRow
              key={tx.id}
              onClick={() => setSelected(tx)}
              icon={<EventIcon glyph={currencySymbol(tx.currency)} tone={STATUS_ICON_TONE[tx.status]} />}
              title={`${tx.plan_name} · ${durationLabel(tx.duration_days, t)}`}
              caption={
                <>
                  {gatewayLabel(tx.gateway_type, t)}
                  {tx.created_at && ` · ${formatDate(tx.created_at, i18n.language)}`}
                </>
              }
              aside={
                <>
                  {hasDiscount(tx) && (
                    <s className="text-[12px] font-normal text-muted-foreground">
                      {formatMoney(tx.base_price, tx.currency, i18n.language)}
                    </s>
                  )}
                  {formatMoney(tx.final_price, tx.currency, i18n.language)}
                  {/* the circle's colour says it on screen */}
                  <span className="sr-only">{t(`payments.statuses.${tx.status}`)}</span>
                </>
              }
            />
          ))}
        </EventList>
      </Card>
      <LoadMore query={query} />
      <PaymentDetailsSheet transaction={selected} onClose={() => setSelected(null)} />
    </>
  );
}

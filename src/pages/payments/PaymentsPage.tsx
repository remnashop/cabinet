import { ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMatch, useSearchParams } from "react-router";

import { getTransaction, useTransactionsInfinite, type Transaction } from "@entities/transaction/api";
import { durationLabel, gatewayLabel } from "@features/purchase/wizard";
import { currencySymbol, formatDate, formatMoney } from "@shared/lib/format";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EventList, EventRow } from "@shared/ui/EventList";
import { IconCircle } from "@shared/ui/IconCircle";
import { LoadMoreButton } from "@shared/ui/LoadMoreButton";
import { PageEmpty } from "@shared/ui/PageEmpty";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

import { PaymentDetailsDialog } from "./PaymentDetailsDialog";
import { hasDiscount, priceBeforeDiscounts } from "./discount";
import { STATUS_ICON_TONE } from "./status-tone";

export function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const query = useTransactionsInfinite();
  const [selected, setSelected] = useState<Transaction | null>(null);
  // a notification link (`?id=`) opens that payment; a missing one leaves just the list
  const [params, setParams] = useSearchParams();
  // the page keeps rendering while it fades out, on the next page's address: only its own `?id=` is its to strip
  const isOwn = useMatch("/profile/payments") !== null;
  const linkedId = isOwn ? params.get("id") : null;
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
              icon={<IconCircle glyph={currencySymbol(tx.currency)} tone={STATUS_ICON_TONE[tx.status]} />}
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
                    <s className="text-xs font-normal text-muted-foreground">
                      {formatMoney(priceBeforeDiscounts(tx), tx.currency, i18n.language)}
                    </s>
                  )}
                  {formatMoney(tx.final_price, tx.currency, i18n.language)}
                </>
              }
            />
          ))}
        </EventList>
      </Card>
      <LoadMoreButton query={query} />
      <PaymentDetailsDialog transaction={selected} onClose={() => setSelected(null)} />
    </>
  );
}

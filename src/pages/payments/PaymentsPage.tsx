import { Receipt } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTransactionsInfinite, type Transaction } from "@entities/transaction/api";
import { durationUnit, gatewayLabel } from "@features/purchase/wizard";
import { formatDate, formatMoney } from "@shared/lib/format";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EVENT_ROW, EventIcon, EventList, EventListEmpty } from "@shared/ui/EventList";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

import { PaymentDetailsSheet } from "./PaymentDetailsSheet";
import { STATUS_COLOR } from "./status-color";

export function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const query = useTransactionsInfinite();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;

  // the "more" button below is the fallback where IntersectionObserver doesn't fire, and the retry after a
  // failure: the observer stays off then, or the still-visible sentinel would refetch in a loop
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const header = <PageHeader title={t("pages.payments")} backTo="/profile" />;
  if (query.isError && !query.data) {
    return (
      <>
        {header}
        <ErrorCard onRetry={() => void query.refetch()} />
      </>
    );
  }
  if (!query.data) {
    return (
      <>
        {header}
        <Skeleton className="h-64" />
      </>
    );
  }

  // offset pages shift when a new payment lands between fetches: the same row can come back on the next page
  const items = [...new Map(query.data.pages.flatMap((page) => page.items).map((tx) => [tx.id, tx])).values()];
  if (!items.length) {
    return (
      <>
        {header}
        <Card>
          <EventListEmpty icon={Receipt} text={t("payments.empty")} />
        </Card>
      </>
    );
  }

  return (
    <>
      {header}
      <Card>
        <EventList>
          {items.map((tx) => {
            const { unit, count } = durationUnit(tx.duration_days);
            return (
              <button
                key={tx.id}
                type="button"
                onClick={() => setSelected(tx)}
                className={`flex w-full ${EVENT_ROW} items-center justify-between gap-3 text-left hover:bg-white/[0.04]`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <EventIcon icon={Receipt} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground/90">
                      {tx.plan_name} · {t(`purchase.${unit}`, { count })}
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {gatewayLabel(tx.gateway_type)}
                      {tx.created_at && ` · ${formatDate(tx.created_at, i18n.language)}`}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[13px] font-semibold">{formatMoney(tx.final_price, tx.currency, i18n.language)}</span>
                  <span className={`block text-[12px] ${STATUS_COLOR[tx.status]}`}>
                    {t(`payments.statuses.${tx.status}`)}
                  </span>
                </span>
              </button>
            );
          })}
        </EventList>
      </Card>
      {hasNextPage && (
        <div ref={sentinel} className="mt-4 flex flex-col items-center gap-2">
          {isFetchNextPageError && <p className="text-sm text-error">{t("common.loadFailed")}</p>}
          <Button variant="outline" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {t("payments.more")}
          </Button>
        </div>
      )}
      <PaymentDetailsSheet transaction={selected} onClose={() => setSelected(null)} />
    </>
  );
}

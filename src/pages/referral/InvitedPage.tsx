import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useInvitedInfinite, type InvitedUser } from "@entities/referral/api";
import { formatDate, formatNumber } from "@shared/lib/format";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EventIcon, EventList, EventRow } from "@shared/ui/EventList";
import { LoadMore } from "@shared/ui/LoadMore";
import { PageEmpty } from "@shared/ui/PageEmpty";
import { Skeleton } from "@shared/ui/Skeleton";
import { PageHeader } from "@widgets/page-header/PageHeader";

/** What one invitee has earned the customer, "+49 баллов · +3 дня"; none, a dash. */
function earned(user: InvitedUser, t: ReturnType<typeof useTranslation>["t"], locale: string): string | null {
  const parts: string[] = [];
  const points = user.reward_amounts.POINTS;
  const days = user.reward_amounts.EXTRA_DAYS;
  if (points && Number(points) > 0) parts.push(t("referral.rewardPoints", { n: formatNumber(points, locale) }));
  if (days && Number(days) > 0) parts.push(t("referral.rewardDays", { count: Number(days) }));
  return parts.length ? parts.join(" · ") : null;
}

export function InvitedPage() {
  const { t, i18n } = useTranslation();
  const query = useInvitedInfinite();

  const header = <PageHeader title={t("pages.invited")} backTo="/invite" />;
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
  const items = query.data.pages.flatMap((page) => page.items);
  if (!items.length) {
    return (
      <>
        {header}
        <PageEmpty icon={Users} text={t("referral.invitedEmpty")} />
      </>
    );
  }
  return (
    <>
      {header}
      <Card round>
        <EventList>
          {items.map((user, i) => {
            const reward = earned(user, t, i18n.language);
            return (
              <EventRow
                key={i}
                icon={<EventIcon glyph={(user.name?.trim()[0] ?? "?").toUpperCase()} tone="bg-primary/12 text-primary" />}
                title={user.name ?? t("referral.goneUser")}
                caption={
                  <>
                    {t("referral.levelN", { level: user.level })}
                    {` · ${formatDate(user.created_at, i18n.language)}`}
                  </>
                }
                aside={<span className={reward ? "text-success" : "text-muted-foreground"}>{reward ?? "—"}</span>}
              />
            );
          })}
        </EventList>
      </Card>
      <LoadMore query={query} />
    </>
  );
}

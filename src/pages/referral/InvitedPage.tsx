import { User, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useInvitedInfinite, type InvitedUser } from "@entities/referral/api";
import { formatDate, formatNumber } from "@shared/lib/format";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EventList, EventRow } from "@shared/ui/EventList";
import { IconCircle } from "@shared/ui/IconCircle";
import { LoadMoreButton } from "@shared/ui/LoadMoreButton";
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
  // newest first: the first invitee is "Friend 1" and keeps the number as new ones arrive on top
  const total = query.data.pages[0]?.total ?? items.length;
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
            const name = user.name?.trim();
            return (
              <EventRow
                key={i}
                icon={
                  name ? (
                    <IconCircle glyph={name[0]!.toUpperCase()} tone="bg-primary/12 text-primary" />
                  ) : (
                    <IconCircle icon={User} tone="bg-white/[0.06] text-muted-foreground" />
                  )
                }
                title={
                  name || (
                    <span className="text-muted-foreground">
                      {t("referral.friendN", { n: total - i })}
                    </span>
                  )
                }
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
      <LoadMoreButton query={query} />
    </>
  );
}

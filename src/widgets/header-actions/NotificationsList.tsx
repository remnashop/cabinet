import type { UseQueryResult } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import type { NotificationFeed } from "@entities/notification/api";
import { formatDateTime } from "@shared/lib/format";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EventIcon, EventList, EventListEmpty, EventRow } from "@shared/ui/EventList";
import { Skeleton } from "@shared/ui/Skeleton";

/** The bell's popover body. A dot is the item's own `read` flag, which marking read leaves alone, so the dots of
 *  what was new stay while the popover is open (the panel's `highlighted`). The feed comes from the bell's own query:
 *  a second observer would refetch on open, racing the mark-read. */
export function NotificationsList({
  feed,
  onClose,
  onSupport,
}: {
  feed: UseQueryResult<NotificationFeed>;
  onClose: () => void;
  /** opens support; undefined without a support contact */
  onSupport?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isError, error, refetch } = feed;

  if (!data) {
    return isError ? (
      <ErrorCard error={error} onRetry={() => void refetch()} />
    ) : (
      <div className="flex flex-col gap-2 p-1.5">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }
  if (data.items.length === 0) return <EventListEmpty icon={Bell} text={t("header.notificationsEmpty")} />;

  return (
    <EventList className="max-h-[420px] overflow-y-auto">
      {data.items.map((item) => (
        <EventRow
          key={item.id}
          icon={<EventIcon icon={Bell} />}
          title={item.title}
          caption={`${item.body} · ${formatDateTime(item.created_at, i18n.language)}`}
          aside={!item.read && <span data-unread className="size-1.5 rounded-full bg-primary" />}
          onClick={() => {
            onClose();
            // `support=1` is the link's ask to open support: drop it from the route, then open it in this very click
            // (a gesture, so the browser lets openExternal through)
            const url = new URL(item.url, window.location.origin);
            const support = url.searchParams.get("support") === "1";
            url.searchParams.delete("support");
            navigate(url.pathname + url.search + url.hash);
            if (support) onSupport?.();
          }}
        />
      ))}
    </EventList>
  );
}

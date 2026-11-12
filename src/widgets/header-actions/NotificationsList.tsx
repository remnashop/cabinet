import type { UseQueryResult } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  BadgePercent,
  Bell,
  CalendarPlus,
  CalendarX,
  CircleCheck,
  Clock,
  CreditCard,
  Gauge,
  Gift,
  Hourglass,
  Merge,
  MonitorSmartphone,
  PackagePlus,
  PlugZap,
  ShieldBan,
  Trash2,
  Undo2,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { useClearNotifications, type NotificationFeed } from "@entities/notification/api";
import { formatRelative } from "@shared/lib/format";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EventList, EventListEmpty, EventRow } from "@shared/ui/EventList";
import { IconCircle } from "@shared/ui/IconCircle";
import { Skeleton } from "@shared/ui/Skeleton";
import { DialogContext } from "@shared/ui/surface";

const WARNING = "bg-warning/15 text-warning";

// the backend's event_type; warning: the ones that ask the customer to act, as the panel's critical announcements
const ICONS: Record<string, { icon: LucideIcon; tone?: string }> = {
  SubscriptionPurchasedEvent: { icon: CircleCheck },
  SubscriptionRenewedEvent: { icon: CalendarPlus },
  SubscriptionChangedEvent: { icon: ArrowLeftRight },
  SubscriptionAddOnGrantedEvent: { icon: PackagePlus },
  SubscriptionGrantedEvent: { icon: Gift },
  TransactionRefundedEvent: { icon: Undo2 },
  TransactionPartiallyRefundedEvent: { icon: Undo2 },
  PaidOrderNotFulfilledEvent: { icon: Hourglass, tone: WARNING },
  SubscriptionExpiringEvent: { icon: Clock, tone: WARNING },
  SubscriptionExpiredEvent: { icon: CalendarX, tone: WARNING },
  SubscriptionExpiredAgoEvent: { icon: CalendarX, tone: WARNING },
  SubscriptionTrafficThresholdEvent: { icon: Gauge, tone: WARNING },
  SubscriptionTrafficLimitedEvent: { icon: Gauge, tone: WARNING },
  SubscriptionNotConnectedEvent: { icon: PlugZap },
  TorrentBlockerReportEvent: { icon: ShieldBan, tone: WARNING },
  CabinetNewDeviceSignInEvent: { icon: MonitorSmartphone, tone: WARNING },
  AccountsMergedEvent: { icon: Merge },
  ReferralRewardIssuedEvent: { icon: UserPlus },
  InviteeRewardIssuedEvent: { icon: Gift },
  PromocodeDiscountExpiringEvent: { icon: BadgePercent },
  PaymentsRestored: { icon: CreditCard },
};

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
  const clear = useClearNotifications();

  if (!data) {
    // the popover is the dialogs' glass: its blocks are their 12px plates, not page cards
    return (
      <DialogContext.Provider value>
        {isError ? (
          <ErrorCard error={error} onRetry={() => void refetch()} />
        ) : (
          <div className="flex flex-col gap-2 p-1.5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}
      </DialogContext.Provider>
    );
  }
  if (data.items.length === 0) return <EventListEmpty icon={Bell} text={t("header.notificationsEmpty")} />;

  return (
    <>
      {/* the panel's bell header: its title, and clearing what's listed */}
      <div className="flex items-center gap-1.5 pb-1.5">
        <span className="min-w-0 flex-1 px-2.5 text-sm font-semibold text-foreground">{t("header.notifications")}</span>
        <button
          type="button"
          onClick={() => clear.mutate()}
          className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <Trash2 className="size-3.5" />
          {t("header.clear")}
        </button>
      </div>
      {/* rows keep their height and the list scrolls: a row clips its ripple, so flex would squeeze it */}
      {/* the panel's bell: 8px over the rows to fade the top into; no footer, so the list runs to the popover's edge and
          fades into its 6px inset */}
      <EventList className="scroll-fade-y -mb-1.5 max-h-[420px] overflow-y-auto pt-2 pb-1.5 [--fade-bottom-size:6px] [--fade-top-size:8px] [&>*]:shrink-0">
        {data.items.map((item) => (
          <EventRow
            key={item.id}
            icon={<IconCircle {...(ICONS[item.event_type] ?? { icon: Bell })} />}
            title={item.title}
            caption={item.body}
            wrap
            meta={formatRelative(item.created_at, i18n.language)}
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
    </>
  );
}

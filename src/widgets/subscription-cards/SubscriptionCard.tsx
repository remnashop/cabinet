import { ChevronRight, Clock, Gift, Smartphone, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { BrandMark } from "@entities/appearance/BrandMark";
import type { OwnSubscription } from "@entities/subscription/api";
import type { CardNotice } from "@entities/subscription/lib";
import {
  cardAlert,
  cardNotice,
  daysAlert,
  timeLeft,
  subscriptionNumber,
  trafficAlert,
  trafficOut,
  trafficRatio,
} from "@entities/subscription/lib";
import { formatBytes, formatDate, formatGb } from "@shared/lib/format";
import { Ripple } from "@shared/ui/Ripple";

// a card needing attention (cardAlert) says so with its texts and the strip; only a selected card that's fine gets a
// long primary arc running slowly round it (.glow, a still contour with reduced motion)
const SELECTED_EDGE = "glow [--glow-duration:5s] [--glow-from:0%] motion-reduce:ring-2 motion-reduce:ring-primary";

// one palette for the days, the traffic and the strip: white while fine
const TEXT_TONE = { ok: "", warning: "text-warning", error: "text-error" };
const BAR_TONE = {
  ok: "bg-success shadow-[0_0_10px_var(--color-success)]",
  warning: "bg-warning shadow-[0_0_10px_var(--color-warning)]",
  error: "bg-error shadow-[0_0_10px_var(--color-error)]",
};
const DOT_TONE = { ok: "bg-white/50", warning: "bg-warning", error: "bg-error" };
// the strip's highlight (.glow) in the alert's color; a disabled or deleted one has nothing to hurry about
const RING_TONE = {
  ok: "",
  warning: "glow [--ring-color:var(--color-warning)]",
  error: "glow [--ring-color:var(--color-error)]",
};

// what the strip asks for under its title: keep access while it lasts, get it back once lost
const NOTICE_HINT: Record<CardNotice, "keepUntil" | "keep" | "back" | null> = {
  deleted: null,
  disabled: null,
  expiredTraffic: "back",
  expired: "back",
  trafficOut: "back",
  bothSoon: "keepUntil",
  daysSoon: "keepUntil",
  trafficSoon: "keep",
};

// "ends in N days" turns to hours, then minutes, as the time left does
function noticeKey(notice: CardNotice, left: ReturnType<typeof timeLeft>) {
  return notice === "daysSoon" ? (`${left.unit}Soon` as const) : notice;
}

const GB = 1024 ** 3;

interface SubscriptionCardProps {
  sub: OwnSubscription;
  devicesUsed?: number;
  /** a short card for pickers: header and days only */
  compact?: boolean;
  /** the strip stands under the card instead (NoticeBar), as in the slider */
  noticeApart?: boolean;
  /** the card picked in a row, or the only one: its edge runs */
  selected?: boolean;
}

/**
 * A subscription styled as a bank card; a strip at its foot says what's wrong, if anything. Its height is its
 * content's, so the strip never needs room carved out of a fixed shape.
 */
export function SubscriptionCard({ sub, devicesUsed, compact, noticeApart, selected }: SubscriptionCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  // fixed per mount: the day count needn't tick while the page is open
  const [now] = useState(() => new Date());
  const ratio = trafficRatio(sub.used_traffic, sub.effective_traffic_limit);
  const deviceLimit = sub.effective_device_limit === 0 ? "∞" : String(sub.effective_device_limit);
  const Icon = sub.is_trial ? Gift : Zap;
  const left = timeLeft(sub.expire_at, now);
  const daysTone = daysAlert(sub, now) ?? "ok";
  const trafficTone = trafficAlert(sub) ?? "ok";
  const notice = compact ? null : cardNotice(sub, now);
  // a disabled or deleted card says so on its strip but has no alert edge: there is nothing to act on in time
  const alert = notice === "disabled" || notice === "deleted" ? null : cardAlert(sub, now);
  const hint = notice && NOTICE_HINT[notice];
  // no access any more (to get back, or disabled, deleted): its texts go grey, the alert's colors stay
  const inactive = hint === "back" || notice === "disabled" || notice === "deleted";
  const date = formatDate(sub.expire_at, locale);

  // the edge is drawn round a wrapper: the card itself clips to its corners. Below lg the card's contents grow with its
  // width (cqw), from a 358px card (a 390px phone) on, so a wide phone's taller card isn't left half empty; the clamps'
  // minimums are the sizes it had, and lg puts them back for the three-across desktop row
  return (
    <div className={`@container/card relative h-full w-full rounded-subscription ${selected && !alert ? SELECTED_EDGE : ""}`}>
      <div
        className={`relative flex h-full w-full flex-col overflow-hidden rounded-subscription border border-white/[0.14] bg-white/[0.06] backdrop-blur-xl backdrop-saturate-150 ${
          inactive ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        <BrandMark className="pointer-events-none absolute -right-5 -bottom-5 size-36 opacity-[0.04]" />

        <div className="relative flex flex-1 flex-col gap-[clamp(12px,3.35cqw,18px)] px-[clamp(18px,5cqw,28px)] py-[clamp(16px,4.5cqw,24px)] lg:gap-3 lg:px-[18px] lg:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[length:clamp(14px,3.9cqw,19px)] font-semibold lg:text-sm">
              <Icon className="size-[clamp(16px,4.5cqw,22px)] shrink-0 lg:size-4" />
              <span className="truncate">{sub.plan_name}</span>
            </div>
            <span className="shrink-0 font-mono text-[length:clamp(12px,3.35cqw,16px)] tracking-[0.12em] text-muted-foreground lg:text-xs">
              {subscriptionNumber(sub.id)}
            </span>
          </div>

          {/* what's left of the traffic, large; the bar shrinks as it's used. With the pills under it, at the foot: a card
              stretched to the slider's height gets the room under its header. The lone desktop card (over 400px, beside
              the tiles) has much more of it: the traffic rises 24px off the pills */}
          {!compact && (
            <div className="mt-auto flex flex-col lg:@min-[400px]/card:mb-6 gap-[clamp(6px,1.7cqw,9px)] lg:gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-[length:clamp(26px,7.3cqw,40px)] shrink-0 whitespace-nowrap font-bold leading-[1.1] tracking-tight lg:text-2xl ${TEXT_TONE[trafficTone]}`}>
                  {sub.effective_traffic_limit === 0
                    ? "∞"
                    : sub.used_traffic === null
                      ? formatGb(sub.effective_traffic_limit, locale)
                      : formatBytes(Math.max(0, sub.effective_traffic_limit * GB - sub.used_traffic), locale)}
                </span>
                {ratio !== null && sub.used_traffic !== null && (
                  <span className="min-w-0 truncate text-[length:clamp(13px,3.65cqw,18px)] font-bold lg:text-xs lg:@min-[340px]/card:text-sm">
                    {t("home.trafficUsed", { value: formatBytes(sub.used_traffic, locale) })}
                  </span>
                )}
              </div>
              {ratio !== null && (
                <div className="h-[clamp(10px,2.8cqw,14px)] overflow-hidden rounded-full bg-black/[0.28] lg:h-2.5">
                  <div className={`h-full rounded-full ${BAR_TONE[trafficTone]}`} style={{ width: `${(1 - ratio) * 100}%` }} />
                </div>
              )}
              {/* used up: nothing "left of" it to speak of, the strip says why; the empty line keeps the traffic where
                  it stands on the other cards */}
              <div className="text-[length:clamp(12px,3.35cqw,16px)] text-muted-foreground lg:text-xs">
                {trafficOut(sub)
                  ? " "
                  : sub.effective_traffic_limit === 0
                    ? t("home.trafficUnlimited")
                    : ratio === null
                      ? t("home.trafficLimit")
                      : t("home.trafficLeftOf", { limit: formatGb(sub.effective_traffic_limit, locale) })}
              </div>
            </div>
          )}

          {/* on a card wider than 358px the gap grows faster than the rest (15% of the extra width), lifting the traffic
              into the room a taller card leaves under its header */}
          <div
            className={`@container/row flex gap-2 ${compact ? "" : "mt-[clamp(4px,calc(4px_+_(100cqw_-_358px)_*_0.15),40px)] lg:mt-1"}`}
          >
            <Pill
              icon={Clock}
              label={t("home.left")}
              value={t(`home.${left.unit}`, { count: left.count })}
              short={left.unit === "days" ? undefined : t(`home.${left.unit}Short`, { count: left.count })}
              tone={TEXT_TONE[daysTone]}
            />
            {!compact && (
              <Pill
                icon={Smartphone}
                label={t("home.devices")}
                value={
                  devicesUsed === undefined
                    ? t("home.devicesUpTo", { limit: deviceLimit })
                    : t("home.devicesOf", { used: devicesUsed, limit: deviceLimit })
                }
              />
          )}
          </div>
        </div>

        {notice && !noticeApart && (
          <div className="relative flex items-center gap-2 bg-black/45 px-[18px] py-2.5">
            <span className={`size-2 shrink-0 rounded-full ${DOT_TONE[alert ?? "ok"]}`} />
            <div className="flex min-w-0 flex-col">
              <span className={`text-sm font-bold ${TEXT_TONE[alert ?? "ok"]}`}>
                {t(`home.notice.${noticeKey(notice, left)}`, { count: left.count, date })}
              </span>
              {hint && (
                <span className="text-xs text-muted-foreground">
                  {t(`home.noticeHint.${hint}${sub.is_trial ? "Trial" : ""}`, { date })}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** The card's strip on its own, under the slider, for the selected card. */
export function NoticeBar({ sub, to }: { sub: OwnSubscription; /** where a tap renews it */ to?: string }) {
  const { t, i18n } = useTranslation();
  const [now] = useState(() => new Date());
  const notice = cardNotice(sub, now);
  const alert = notice === "disabled" || notice === "deleted" ? null : cardAlert(sub, now);
  const hint = notice && NOTICE_HINT[notice];
  const left = timeLeft(sub.expire_at, now);
  const date = formatDate(sub.expire_at, i18n.language);

  if (!notice) return null;
  // a disabled or deleted one has nothing to renew: no link
  const link = alert ? to : undefined;
  const className = `flex min-h-16 items-center gap-2.5 rounded-full glass-panel px-6 py-2 ${RING_TONE[alert ?? "ok"]}`;
  const content = (
    <>
      <span className={`size-2 shrink-0 rounded-full ${DOT_TONE[alert ?? "ok"]}`} />
      <div className="flex min-w-0 flex-col">
        <span className={`text-sm font-bold ${TEXT_TONE[alert ?? "ok"]}`}>
          {t(`home.notice.${noticeKey(notice, left)}`, { count: left.count, date })}
        </span>
        {hint && (
          <span className="text-xs text-muted-foreground">
            {t(`home.noticeHint.${hint}${sub.is_trial ? "Trial" : ""}`, { date })}
          </span>
        )}
      </div>
      {link && <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />}
    </>
  );

  return link ? (
    <Link to={link} className={`relative ${className} transition-colors hover:bg-white/[0.06]`}>
      <Ripple />
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

/**
 * short: the value abbreviated ("23 ч"), shown instead while the full one would overflow or cut the word off. Its cqw
 * are the pill row's (@container/row: 322px on a 358px card), not the card's.
 */
function Pill({
  icon: Icon,
  label,
  value,
  short,
  tone = "",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  short?: string;
  tone?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [abbreviated, setAbbreviated] = useState(false);
  // a resize or a new value tries the full one again; the check below, before paint, falls back if it doesn't fit
  useEffect(() => {
    const el = ref.current;
    if (!el || !short) return;
    const observer = new ResizeObserver(() => setAbbreviated(false));
    observer.observe(el);
    return () => observer.disconnect();
  }, [short, value]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !short || abbreviated) return;
    const cut = (node: Element) => node.scrollWidth > node.clientWidth;
    if (cut(el) || [...el.children].some(cut)) setAbbreviated(true);
  }, [abbreviated, short, value]);
  return (
    <span
      ref={ref}
      className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-full bg-black/[0.22] px-[clamp(12px,3.7cqw,18px)] py-[clamp(6px,1.9cqw,9px)] text-[length:clamp(12px,3.7cqw,16px)] lg:px-3 lg:py-1.5 lg:text-xs"
    >
      <Icon className="size-[clamp(14px,4.35cqw,19px)] shrink-0 text-muted-foreground lg:size-3.5 @min-[290px]/row:hidden" />
      <span className="hidden truncate text-muted-foreground @min-[290px]/row:block">{label}</span>
      <span className={`shrink-0 font-bold ${tone}`}>{abbreviated && short ? short : value}</span>
    </span>
  );
}

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

  // the edge is drawn round a wrapper: the card itself clips to its corners
  return (
    <div className={`relative h-full w-full rounded-home ${selected && !alert ? SELECTED_EDGE : ""}`}>
      <div
        className={`relative flex h-full w-full flex-col overflow-hidden rounded-home border border-white/[0.14] bg-white/[0.06] backdrop-blur-xl backdrop-saturate-150 ${
          inactive ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        <BrandMark className="pointer-events-none absolute -right-5 -bottom-5 size-36 opacity-[0.04]" />

        <div className="relative flex flex-1 flex-col gap-3 px-[18px] py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{sub.plan_name}</span>
            </div>
            <span className="shrink-0 font-mono text-[12px] tracking-[0.12em] text-muted-foreground">
              {subscriptionNumber(sub.id)}
            </span>
          </div>

          {/* what's left of the traffic, large; the bar shrinks as it's used. With the pills under it, at the foot: a card
              stretched to the slider's height gets the room under its header */}
          {!compact && (
            <div className="mt-auto flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-[26px] font-bold leading-[1.1] tracking-tight ${TEXT_TONE[trafficTone]}`}>
                  {sub.effective_traffic_limit === 0
                    ? "∞"
                    : sub.used_traffic === null
                      ? formatGb(sub.effective_traffic_limit, locale)
                      : formatBytes(Math.max(0, sub.effective_traffic_limit * GB - sub.used_traffic), locale)}
                </span>
                {ratio !== null && sub.used_traffic !== null && (
                  <span className="min-w-0 truncate text-[13px] font-bold">
                    {t("home.trafficUsed", { value: formatBytes(sub.used_traffic, locale) })}
                  </span>
                )}
              </div>
              {ratio !== null && (
                <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.28]">
                  <div className={`h-full rounded-full ${BAR_TONE[trafficTone]}`} style={{ width: `${(1 - ratio) * 100}%` }} />
                </div>
              )}
              {/* used up: nothing "left of" it to speak of, the strip says why; the empty line keeps the traffic where
                  it stands on the other cards */}
              <div className="text-[12px] text-muted-foreground">
                {trafficOut(sub)
                  ? "\u00a0"
                  : sub.effective_traffic_limit === 0
                    ? t("home.trafficUnlimited")
                    : ratio === null
                      ? t("home.trafficLimit")
                      : t("home.trafficLeftOf", { limit: formatGb(sub.effective_traffic_limit, locale) })}
              </div>
            </div>
          )}

          <div className={`@container/row flex gap-2 ${compact ? "" : "mt-1"}`}>
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
                <span className="text-[12px] text-muted-foreground">
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
  const className = `mb-3 flex min-h-16 items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-6 py-2 ${RING_TONE[alert ?? "ok"]}`;
  const content = (
    <>
      <span className={`size-2 shrink-0 rounded-full ${DOT_TONE[alert ?? "ok"]}`} />
      <div className="flex min-w-0 flex-col">
        <span className={`text-sm font-bold ${TEXT_TONE[alert ?? "ok"]}`}>
          {t(`home.notice.${noticeKey(notice, left)}`, { count: left.count, date })}
        </span>
        {hint && (
          <span className="text-[12px] text-muted-foreground">
            {t(`home.noticeHint.${hint}${sub.is_trial ? "Trial" : ""}`, { date })}
          </span>
        )}
      </div>
      {link && <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden />}
    </>
  );

  return link ? (
    <Link to={link} className={`${className} transition-colors hover:bg-white/[0.06]`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

/** short: the value abbreviated ("23 ч"), shown instead while the full one would overflow or cut the word off. */
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
    // the screen-reader copy is clipped to 1px by design
    const cut = (node: Element) => !node.classList.contains("sr-only") && node.scrollWidth > node.clientWidth;
    if (cut(el) || [...el.children].some(cut)) setAbbreviated(true);
  }, [abbreviated, short, value]);
  return (
    <span
      ref={ref}
      className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-full bg-black/[0.22] px-3 py-1.5 text-[12px]"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground @min-[290px]/row:hidden" aria-hidden />
      {/* not-sr-only would undo truncate, so the word and its screen-reader copy are two spans */}
      <span className="sr-only @min-[290px]/row:hidden">{label}</span>
      <span className="hidden truncate text-muted-foreground @min-[290px]/row:block">{label}</span>
      <span className={`shrink-0 font-bold ${tone}`}>{abbreviated && short ? short : value}</span>
    </span>
  );
}

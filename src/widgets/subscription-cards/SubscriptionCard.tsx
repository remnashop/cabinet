import { Gift, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { OwnSubscription } from "@entities/subscription/api";
import { daysLeft, trafficColor, trafficRatio, urgency } from "@entities/subscription/lib";
import { formatBytes, formatDate, formatGb } from "@shared/lib/format";

import "@widgets/subscription-cards/card.css";

const LABEL = "text-[9.5px] font-semibold uppercase tracking-[0.08em] opacity-85";

interface SubscriptionCardProps {
  sub: OwnSubscription;
  /** picks one of the three backgrounds, so neighbouring cards differ */
  index: number;
  devicesUsed?: number;
  /** a short card for pickers: header, number and expiry only */
  compact?: boolean;
}

/** A subscription styled as a bank card (ISO 7810 proportions). */
export function SubscriptionCard({ sub, index, devicesUsed, compact }: SubscriptionCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  // fixed per mount: the day count needn't tick while the page is open
  const [now] = useState(() => new Date());
  const state = urgency(sub, now);
  const ratio = trafficRatio(sub.used_traffic, sub.effective_traffic_limit);
  // 0 = unlimited
  const trafficLimit = sub.effective_traffic_limit === 0 ? "∞" : formatGb(sub.effective_traffic_limit, locale);
  const traffic =
    sub.used_traffic === null ? trafficLimit : `${formatBytes(sub.used_traffic, locale)} / ${trafficLimit}`;
  const deviceLimit = sub.effective_device_limit === 0 ? "∞" : String(sub.effective_device_limit);
  const Icon = sub.is_trial ? Gift : Zap;

  return (
    <div
      className={`relative flex w-full ${compact ? "aspect-[2.6]" : "aspect-[1.586]"} flex-col justify-between overflow-hidden rounded-[20px] border border-white/[0.14] px-[18px] py-4 text-white`}
    >
      <div className="sub-card-bg" data-palette={index % 3} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/35" />
      <div className="pointer-events-none absolute -bottom-4 -right-1.5 text-[90px] font-black leading-none tracking-[-4px] opacity-[0.07]">
        {t("app.name").charAt(0)}
      </div>

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{sub.plan_name}</span>
        </div>
        <span className="shrink-0 rounded-full border border-white/[0.18] bg-black/25 px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] backdrop-blur-sm">
          {t(`home.status.${sub.status}`)}
        </span>
      </div>

      <div className="relative font-mono text-sm tracking-[0.14em] opacity-95">#{String(sub.id).padStart(4, "0")}</div>

      <div className="relative">
        {!compact && ratio !== null && (
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.22]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${ratio * 100}%`,
                background: trafficColor(ratio),
                boxShadow: `0 0 10px ${trafficColor(ratio)}`,
              }}
            />
          </div>
        )}
        {!compact && <div className={`mt-1 ${LABEL}`}>{t("home.traffic", { value: traffic })}</div>}

        <div className="mt-2 flex items-end justify-between">
          <div>
            {state === "expired" ? (
              <div className="text-[17px] font-extrabold leading-none text-error">{t("home.expired")}</div>
            ) : (
              <>
                <div className={LABEL}>{t("home.left")}</div>
                <div className={`text-[17px] font-extrabold leading-none ${state === "soon" ? "text-warning" : ""}`}>
                  {t("home.days", { count: daysLeft(sub.expire_at, now) })}
                </div>
              </>
            )}
            <div className="mt-0.5 text-[10px] opacity-85">
              {t("home.until", { date: formatDate(sub.expire_at, locale) })}
            </div>
          </div>
          {!compact && (
          <div className="text-right">
            <div className={LABEL}>{t("home.devices")}</div>
            <div className="font-semibold">
              {devicesUsed === undefined
                ? t("home.devicesUpTo", { limit: deviceLimit })
                : t("home.devicesOf", { used: devicesUsed, limit: deviceLimit })}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

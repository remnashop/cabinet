import {
  Check,
  CircleCheck,
  Download,
  Globe,
  Info,
  Link2,
  Plus,
  Power,
  QrCode,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { ConnectButton, ConnectGuide, PlatformId, StepIcon } from "@entities/connect-guide/api";
import { buildDeepLink, chooseApp, detectPlatform, encodeHop, localized } from "@entities/connect-guide/lib";
import type { OwnSubscription } from "@entities/subscription/api";
import { daysLeft, STATUS_TONE, urgency } from "@entities/subscription/lib";
import { formatBytes, formatDate, formatGb } from "@shared/lib/format";
import { readStorage, writeStorage } from "@shared/lib/safe-storage";
import { haptic, isMiniApp, openExternal } from "@shared/telegram";
import { Badge } from "@shared/ui/Badge";
import { Button } from "@shared/ui/Button";
import { buttonClass } from "@shared/ui/button-class";
import { Card } from "@shared/ui/Card";

import { useCopyLink } from "./use-copy-link";

const STEP_ICON: Record<StepIcon, LucideIcon> = {
  download: Download,
  plus: Plus,
  power: Power,
  settings: Settings,
  check: CircleCheck,
  link: Link2,
  qr: QrCode,
  info: Info,
  shield: ShieldCheck,
  globe: Globe,
};

const PLATFORM_KEY = "cabinet_connect_platform";
const appKey = (platform: PlatformId) => `cabinet_connect_app_${platform}`;

const CHIP = "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors";
const chipClass = (active: boolean) =>
  `${CHIP} ${active ? "border-primary/45 bg-accent text-primary" : "border-white/[0.08] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"}`;

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-[18px] py-4">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate text-[15px] font-semibold">{children}</span>
    </div>
  );
}

function Facts({ subscription }: { subscription: OwnSubscription }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [now] = useState(() => new Date());
  const state = urgency(subscription, now);
  const limit = subscription.effective_traffic_limit === 0 ? "∞" : formatGb(subscription.effective_traffic_limit, locale);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Fact label={t("connect.plan")}>{subscription.plan_name}</Fact>
      <Fact label={t("connect.status")}>
        <Badge tone={STATUS_TONE[subscription.status]}>{t(`home.status.${subscription.status}`)}</Badge>
      </Fact>
      <Fact label={t("connect.until", { date: formatDate(subscription.expire_at, locale) })}>
        <span className={state === "expired" ? "text-error" : state === "soon" ? "text-warning" : ""}>
          {state === "expired" ? t("home.expired") : t("home.days", { count: daysLeft(subscription.expire_at, now) })}
        </span>
      </Fact>
      <Fact label={t("connect.traffic")}>
        {subscription.used_traffic === null ? limit : `${formatBytes(subscription.used_traffic, locale)} / ${limit}`}
      </Fact>
    </div>
  );
}

function StepButton({ button, subscription }: { button: ConnectButton; subscription: OwnSubscription }) {
  const { t, i18n } = useTranslation();
  const [copied, copy] = useCopyLink(subscription.url);
  const label = localized(button.label, i18n.language);

  if (button.kind === "copy_link") {
    return (
      <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => void copy()}>
        {copied && <Check className="size-3.5" />}
        {copied ? t("connect.copied") : label}
      </Button>
    );
  }
  if (button.kind === "external") {
    return (
      <Button variant="secondary" size="sm" onClick={() => openExternal(button.url)}>
        {label}
      </Button>
    );
  }
  const link = buildDeepLink(button.template, button.encode, subscription.url);
  if (isMiniApp()) {
    // the Mini App webview can't open an app scheme: hop into the browser, onto a page that can, and
    // hand it the signature it checks the subscription with (the page is public, its address forgeable)
    const hop = encodeHop({ link, sub: subscription.url, sig: subscription.connect_signature });
    return (
      <Button
        variant="accent"
        size="sm"
        onClick={() => {
          haptic();
          openExternal(`${window.location.origin}/connect/open#${hop}`);
        }}
      >
        {label}
      </Button>
    );
  }
  // a real anchor: browsers hand an app scheme to the OS from a followed link, a scripted navigation
  // to one is what gets swallowed
  return (
    <a href={link} onClick={() => haptic()} className={buttonClass("accent", "sm")}>
      {label}
    </a>
  );
}

/** The connect screen: the subscription's facts, then one card with platform, app and the steps. */
export function GuideView({
  guide,
  subscription,
  linkAction,
}: {
  guide: ConnectGuide;
  subscription: OwnSubscription;
  linkAction: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const ids = guide.platforms.map((p) => p.id);
  const [detected] = useState(() => detectPlatform(navigator.userAgent, navigator.maxTouchPoints));
  const [chosen, setChosen] = useState(() => {
    const saved = readStorage(PLATFORM_KEY) as PlatformId | null;
    return saved !== null && ids.includes(saved) ? saved : null;
  });
  const platformId = chosen ?? (detected !== null && ids.includes(detected) ? detected : ids[0]!);
  const [appIds, setAppIds] = useState<Partial<Record<PlatformId, string>>>({});
  const platform = guide.platforms.find((p) => p.id === platformId) ?? guide.platforms[0]!;
  const app = chooseApp(platform, appIds[platform.id] ?? readStorage(appKey(platform.id)));

  return (
    <div className="flex flex-col gap-4">
      <Facts subscription={subscription} />
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">{t("connect.install")}</h2>
          {linkAction}
        </div>

        {guide.platforms.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
            {guide.platforms.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setChosen(p.id);
                  writeStorage(PLATFORM_KEY, p.id);
                }}
                className={chipClass(p.id === platform.id)}
              >
                {t(`connect.platforms.${p.id}`)}
              </button>
            ))}
          </div>
        )}

        {chosen === null && (detected === null || !ids.includes(detected)) && (
          <p className="text-[12px] text-muted-foreground">{t("connect.noSectionForDevice")}</p>
        )}

        {platform.apps.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {platform.apps.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => {
                  setAppIds((prev) => ({ ...prev, [platform.id]: candidate.id }));
                  writeStorage(appKey(platform.id), candidate.id);
                }}
                className={chipClass(candidate.id === app?.id)}
              >
                {candidate.name}
                {candidate.featured && (
                  <span aria-label={t("connect.recommended")} className="size-1.5 rounded-full bg-warning" />
                )}
              </button>
            ))}
          </div>
        )}

        {app && (
          <ol className="flex flex-col">
            {app.steps.map((step, index) => {
              const Icon = STEP_ICON[step.icon];
              const last = index === app.steps.length - 1;
              const body = localized(step.body, language);
              return (
                <li key={index} className="flex gap-3">
                  {/* the rail: the icon in a ring, a line down to the next step */}
                  <div className="flex flex-col items-center">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    {!last && <span className="w-px flex-1 bg-border" />}
                  </div>
                  <div className={`flex min-w-0 flex-1 flex-col gap-1 pt-1.5 ${last ? "" : "pb-5"}`}>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("connect.step", { n: index + 1 })}
                    </span>
                    <span className="text-sm font-semibold">{localized(step.title, language)}</span>
                    {body && <p className="text-[13px] text-muted-foreground">{body}</p>}
                    {step.buttons.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {step.buttons.map((button, at) => (
                          <StepButton key={at} button={button} subscription={subscription} />
                        ))}
                      </div>
                    )}
                    {/* the catalog's text promises the app; from a Mini App a browser page opens first */}
                    {isMiniApp() && step.buttons.some((b) => b.kind === "deep_link") && (
                      <p className="text-[12px] text-muted-foreground">{t("connect.hopHint")}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}

import {
  ArrowRight,
  Check,
  CircleFadingPlus,
  CloudOff,
  CloudUpload,
  Copy,
  House,
  Laptop,
  Monitor,
  Plus,
  Smartphone,
  Tablet,
  Terminal,
  Tv,
  Unplug,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import type { ConnectButton, ConnectGuide, PlatformId } from "@entities/connect-guide/api";
import { buildDeepLink, chooseApp, detectPlatform, encodeHop, splitSteps } from "@entities/connect-guide/lib";
import type { OwnSubscription } from "@entities/subscription/api";
import { readStorage, writeStorage } from "@shared/lib/safe-storage";
import { haptic, isMiniApp, openExternal } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { AndroidIcon, AppleIcon, DevicesIcon, LinuxIcon, TvIcon, WindowsIcon } from "@shared/ui/PlatformIcons";
import { StepTransition } from "@shared/ui/StepTransition";
import { PulseButton } from "@shared/ui/PulseButton";
import { RippleButton } from "@shared/ui/RippleButton";
import { useRipple } from "@shared/ui/use-ripple";
import { PageHeader } from "@widgets/page-header/PageHeader";

import { Confetti } from "./Confetti";
import { CopyLinkField } from "./CopyLinkField";
import { Hero, HeroArt, SuccessArt } from "./HeroArt";
import { useCopyLink } from "./use-copy-link";

const appKey = (platform: PlatformId) => `cabinet_connect_app_${platform}`;

const CHIP = "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors";
const chipClass = (active: boolean) =>
  `${CHIP} ${active ? "border-primary/45 bg-accent text-primary" : "border-white/[0.08] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"}`;

type DeepLinkButton = Extract<ConnectButton, { kind: "deep_link" }>;

/** How a deep link opens the app: a link to follow, or from a Mini App a hop through the browser. */
function deepLinkAction(button: DeepLinkButton, subscription: OwnSubscription): { href: string } | { onClick: () => void } {
  const link = buildDeepLink(button.template, button.encode, subscription.url);
  if (isMiniApp()) {
    // the Mini App webview can't open an app scheme: hop into the browser, onto a page that can, and
    // hand it the signature it checks the subscription with (the page is public, its address forgeable)
    const hop = encodeHop({ link, sub: subscription.url, sig: subscription.connect_signature });
    return {
      onClick: () => {
        haptic();
        openExternal(`${window.location.origin}/connect/open#${hop}`);
      },
    };
  }
  // a real anchor: browsers hand an app scheme to the OS from a followed link, a scripted navigation
  // to one is what gets swallowed
  return { href: link };
}

type Stage = "start" | "device" | "app" | "add" | "done";

const PLATFORM_MARKS: { id: PlatformId; mark: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "ios", mark: AppleIcon },
  { id: "android", mark: AndroidIcon },
  { id: "macos", mark: AppleIcon },
  { id: "windows", mark: WindowsIcon },
  { id: "androidtv", mark: TvIcon },
  { id: "appletv", mark: TvIcon },
  { id: "linux", mark: LinuxIcon },
];
const MAIN_PLATFORMS: PlatformId[] = ["ios", "android", "macos", "windows"];

/** The full label while it fits on one line, the short one once it would wrap (a phone, beside the button's icon). */
function FitLabel({ full, short }: { full: string; short: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shortened, setShortened] = useState(false);
  // the button's resize tries the full one again (not the label's: its width follows the text); the check below,
  // before paint, falls back if it's cut
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver(() => setShortened(false));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!shortened && el && el.scrollWidth > el.clientWidth) setShortened(true);
  }, [shortened, full]);
  // the short one may still wrap on the narrowest phones: no truncate on it
  return (
    <span ref={ref} className={shortened ? "min-w-0" : "min-w-0 truncate"}>
      {shortened ? short : full}
    </span>
  );
}

function PlatformMark({ platform }: { platform: PlatformId }) {
  const Mark = PLATFORM_MARKS.find((p) => p.id === platform)?.mark;
  return Mark ? <Mark className="size-5" /> : null;
}

// what a person picks; iPhone and iPad share the catalog's one iOS section
type DeviceKey = "iphone" | "ipad" | "android" | "windows" | "mac" | "androidtv" | "appletv" | "linux";
/** The device to highlight: the browser's platform, an iPad told from an iPhone the way detectPlatform does. */
function detectDevice(): DeviceKey | null {
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
  if (platform !== "ios") return DEVICES.find((d) => d.platform === platform)?.key ?? null;
  return /ipad|macintosh/i.test(navigator.userAgent) ? "ipad" : "iphone";
}

const DEVICES: { key: DeviceKey; platform: PlatformId; icon: LucideIcon }[] = [
  { key: "iphone", platform: "ios", icon: Smartphone },
  { key: "ipad", platform: "ios", icon: Tablet },
  { key: "android", platform: "android", icon: Smartphone },
  { key: "windows", platform: "windows", icon: Monitor },
  { key: "mac", platform: "macos", icon: Laptop },
  { key: "androidtv", platform: "androidtv", icon: Tv },
  { key: "appletv", platform: "appletv", icon: Tv },
  { key: "linux", platform: "linux", icon: Terminal },
];

function PlatformTile({
  mark: Mark,
  title,
  hint,
  onClick,
}: {
  mark: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  const ripple = useRipple();
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={ripple.onPointerDown}
      // an odd one out on a phone takes the whole last row; three to a row on desktop, it stays one
      className="relative flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-linear-160 from-primary/10 to-white/[0.02] to-60% p-4 text-left transition-colors last:odd:col-span-2 hover:bg-white/[0.04] lg:last:odd:col-span-1"
    >
      {ripple.ripples}
      <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
        <Mark className="size-6" strokeWidth={1.67} />
      </span>
      <span className="flex flex-col leading-snug">
        <span className="text-base font-bold">{title}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

/** The connect screen, a wizard: the detected device or a pick, the app, adding the subscription, done. */
export function GuideView({
  guide,
  subscription,
  onShowLink,
}: {
  guide: ConnectGuide;
  subscription: OwnSubscription;
  /** opens the link-and-QR dialog: how the subscription reaches another device */
  onShowLink: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [detected] = useState(detectDevice);
  const devices = DEVICES.filter((d) => guide.platforms.some((p) => p.id === d.platform));
  const here = devices.find((d) => d.key === detected);
  const [stage, setStage] = useState<Stage>(here ? "start" : "device");
  const [platformId, setPlatformId] = useState<PlatformId | null>(null);
  // set up from the start screen, on the device in hand: no link or QR to carry it over to another
  const [onThisDevice, setOnThisDevice] = useState(false);
  const [appIds, setAppIds] = useState<Partial<Record<PlatformId, string>>>({});
  const platform = guide.platforms.find((p) => p.id === platformId);
  const app = platform && chooseApp(platform, appIds[platform.id] ?? readStorage(appKey(platform.id)));
  const steps = splitSteps(app?.steps ?? []);
  const [copied, copyLink] = useCopyLink(subscription.url);
  // the store link: the first external button of the install steps, else of any step
  const download = [...steps.app, ...(app?.steps ?? [])]
    .flatMap((step) => step.buttons)
    .find((button) => button.kind === "external");
  // for another device the store link is copied to pass on, not opened here
  const [storeCopied, copyStore] = useCopyLink(download?.url ?? "");
  const [showAll, setShowAll] = useState(false);
  const platforms = PLATFORM_MARKS.filter((p) => guide.platforms.some((g) => g.id === p.id));
  const go = (next: Stage) => {
    haptic();
    setStage(next);
  };
  // the header's back walks the steps; from the first one it leaves for home
  const prev: Stage | null = {
    start: null,
    device: here ? "start" : null,
    app: onThisDevice ? "start" : "device",
    add: "app",
    done: "add",
  }[stage] as Stage | null;
  const onBack = useCallback(() => {
    if (!prev) return;
    haptic();
    setStage(prev);
  }, [prev]);
  const header = <PageHeader title={t("connect.title")} backTo="/" onBack={prev ? onBack : undefined} />;

  if (stage === "start" && here) {
    return (
      <StepTransition stepKey={stage}>
        {header}
        <Hero
          title={t("connect.setupOn", { device: t(`connect.devices.${here.key}`) })}
          hint={t("connect.setupHint")}
          art={<HeroArt icon={Unplug} />}
        >
          <PulseButton
            onClick={() => {
              setPlatformId(here.platform);
              setOnThisDevice(true);
              go("app");
            }}
          >
            {/* this device's platform logo, as the "other device" list shows it: Apple's for an iPhone or a Mac */}
            <PlatformMark platform={here.platform} />
            <FitLabel full={t("connect.startHere")} short={t("connect.startHereShort")} />
          </PulseButton>
          <Button variant="outline" size="lg" onClick={() => go("device")}>
            <DevicesIcon className="size-5" />
            {t("connect.otherDevice")}
          </Button>
        </Hero>
      </StepTransition>
    );
  }

  if (stage === "app" && platform && !app) {
    // a platform the catalog lists with no app in it: nothing to install, say so instead of a dead end
    return (
      <StepTransition stepKey={stage}>
        {header}
        <Hero
          title={t("connect.unavailableTitle")}
          hint={t("connect.unavailableHint", { platform: t(`connect.platforms.${platform.id}`) })}
          art={<HeroArt icon={CloudOff} />}
        >
          <Button variant="solid" size="lg" onClick={() => go("device")}>
            {t("connect.pickOther")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => void navigate("/")}>
            {t("connect.backHome")}
          </Button>
        </Hero>
      </StepTransition>
    );
  }

  if (stage === "app" && app && platform) {
    return (
      <StepTransition stepKey={stage}>
        {header}
        <Hero
          title={t("connect.stageTitles.app")}
          hint={t(onThisDevice ? "connect.appHint" : "connect.appHintOther", { app: app.name })}
          art={<HeroArt icon={CloudUpload} />}
          above={
            platform.apps.length > 1 && (
              <div className="flex flex-wrap justify-center gap-2">
                {platform.apps.map((candidate) => (
                  <RippleButton
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      setAppIds((prev) => ({ ...prev, [platform.id]: candidate.id }));
                      writeStorage(appKey(platform.id), candidate.id);
                    }}
                    className={`relative ${chipClass(candidate.id === app.id)}`}
                  >
                    {candidate.name}
                    {candidate.featured && (
                      <span aria-label={t("connect.recommended")} className="size-1.5 rounded-full bg-primary" />
                    )}
                  </RippleButton>
                ))}
              </div>
            )
          }
        >
          {download && (
            <PulseButton onClick={onThisDevice ? () => openExternal(download.url) : () => void copyStore()}>
              {onThisDevice ? (
                <CloudUpload className="size-5" />
              ) : storeCopied ? (
                <Check className="size-5" />
              ) : (
                <Copy className="size-5" />
              )}
              {onThisDevice ? t("connect.installApp") : storeCopied ? t("connect.copied") : t("connect.appLink")}
            </PulseButton>
          )}
          <Button variant="outline" size="lg" onClick={() => go("add")}>
            {t("connect.nextStep")}
            <ArrowRight className="size-5" />
          </Button>
        </Hero>
      </StepTransition>
    );
  }

  if (stage === "add" && app && !onThisDevice) {
    // the app is on another device: the subscription goes there by QR or a pasted link, not a deep link here
    return (
      <StepTransition stepKey={stage}>
        {header}
        <Hero
          title={t("connect.stageTitles.add")}
          hint={t("connect.addHintOther", { app: app.name })}
          art={<HeroArt icon={CircleFadingPlus} />}
        >
          <PulseButton onClick={onShowLink}>
            <Plus className="size-5" />
            {t("connect.addSubscription")}
          </PulseButton>
          <Button variant="outline" size="lg" onClick={() => go("done")}>
            {t("connect.nextStep")}
            <ArrowRight className="size-5" />
          </Button>
        </Hero>
      </StepTransition>
    );
  }

  if (stage === "add" && app) {
    // the catalog's button that opens the app with the subscription; without one the link is copied by hand
    const add = steps.add.flatMap((step) => step.buttons).find((b): b is DeepLinkButton => b.kind === "deep_link");
    const action = add && deepLinkAction(add, subscription);
    return (
      <StepTransition stepKey={stage}>
        {header}
        <Hero
          title={t("connect.stageTitles.add")}
          hint={t(add ? "connect.addHint" : "connect.addManually", { app: app.name })}
          art={<HeroArt icon={CircleFadingPlus} />}
          // the catalog's text promises the app; from a Mini App a browser page opens first
          above={action && "onClick" in action && <p className="text-xs text-muted-foreground">{t("connect.hopHint")}</p>}
        >
          {action ? (
            <PulseButton {...action}>
              <Plus className="size-5" />
              {t("connect.addSubscription")}
            </PulseButton>
          ) : (
            <PulseButton onClick={() => void copyLink()}>
              {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
              {copied ? t("connect.copied") : t("connect.copyLink")}
            </PulseButton>
          )}
          <Button variant="outline" size="lg" onClick={() => go("done")}>
            {t("connect.nextStep")}
            <ArrowRight className="size-5" />
          </Button>
        </Hero>
      </StepTransition>
    );
  }

  if (stage === "done") {
    return (
      <StepTransition stepKey={stage}>
        {header}
        <Confetti />
        <Hero
          title={t("connect.stageTitles.done")}
          hint={t("connect.doneHint", { app: app?.name ?? "" })}
          art={<SuccessArt />}
        >
          <Button variant="solid" size="lg" onClick={() => void navigate("/")}>
            <House className="size-5" />
            {t("connect.backHome")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => go("device")}>
            {t("connect.otherDevice")}
          </Button>
        </Hero>
      </StepTransition>
    );
  }

  // the other platforms open on demand; the four everyone has come first
  const shown = platforms.filter((p) => showAll || MAIN_PLATFORMS.includes(p.id));
  const hidden = platforms.length - shown.length;
  return (
    <StepTransition stepKey={stage}>
      {header}
      <Hero
        title={t("connect.otherTitle")}
        hint={t("connect.otherHint")}
        art={
          <div className="flex w-full flex-1 flex-col justify-center gap-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {shown.map(({ id, mark }) => (
                <PlatformTile
                  key={id}
                  mark={mark}
                  title={t(`connect.platforms.${id}`)}
                  hint={t(`connect.platformHints.${id}`)}
                  onClick={() => {
                    setPlatformId(id);
                    setOnThisDevice(false);
                    go("app");
                  }}
                />
              ))}
            </div>
            {hidden > 0 && (
              <Button variant="outline" size="lg" onClick={() => setShowAll(true)}>
                {t("connect.morePlatforms")}
              </Button>
            )}
          </div>
        }
      >
        <CopyLinkField url={subscription.url} />
      </Hero>
    </StepTransition>
  );
}

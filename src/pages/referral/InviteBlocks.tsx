import {
  CalendarPlus,
  ChevronRight,
  CircleHelp,
  Coins,
  CreditCard,
  Gift,
  QrCode,
  Share2,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { ReferralProgram } from "@entities/referral/api";
import { rewardTerms } from "@features/referral/links";
import { formatNumber } from "@shared/lib/format";
import { Button } from "@shared/ui/Button";
import { ICON_CIRCLE_CLASS } from "@shared/ui/button-class";
import { ActionTile } from "@shared/ui/ActionTile";
import { Card } from "@shared/ui/Card";
import { RippleButton } from "@shared/ui/RippleButton";
import { Skeleton } from "@shared/ui/Skeleton";
import { CopyLinkField } from "@pages/connect/CopyLinkField";

export interface InviteData {
  program: ReferralProgram;
  /** the link to share: the bot's in the Mini App, the cabinet's on the web; null without a code */
  main: string | null;
  /** the bot link is unknown until the settings arrive */
  linkPending: boolean;
  invited: number;
  points: string;
  bonusDays: number;
  /** the downline's size per level, "1" → 5 */
  countsByLevel: Record<string, number>;
  onQr: () => void;
  onRedeemDays: () => void;
  /** the support dialog, points are exchanged there; undefined without a support contact */
  onWithdraw?: () => void;
  onInvited: () => void;
}

function LinkField({ data }: { data: InviteData }) {
  const { t } = useTranslation();
  if (data.linkPending) return <Skeleton corners="rounded-full" className="h-15 w-full" />;
  if (!data.main) return <p className="text-sm text-muted-foreground">{t("referral.noCode")}</p>;
  return <CopyLinkField url={data.main} caption={t("referral.yourLink")} />;
}

function BalanceTiles({ data }: { data: InviteData }) {
  const { t, i18n } = useTranslation();
  const points = Number(data.points);
  return (
    <div className={`grid gap-5 ${points > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
      {points > 0 && (
        <ActionTile
          round
          value={<span className="text-primary">{formatNumber(data.points, i18n.language)}</span>}
          label={t("profile.pointsCount", { count: points })}
          // withdrawing goes through support: with a whole point to withdraw and somewhere to ask
          onClick={points >= 1 ? data.onWithdraw : undefined}
        />
      )}
      {/* agrees with the number above it; nothing to apply without days */}
      <ActionTile
        round
        value={<span className="text-primary">{data.bonusDays}</span>}
        label={t("profile.bonusDaysCount", { count: data.bonusDays })}
        onClick={data.onRedeemDays}
        disabled={data.bonusDays === 0}
      />
    </div>
  );
}

function NetworkChain({ data }: { data: InviteData }) {
  const { t } = useTranslation();
  const levels = Array.from({ length: data.program.max_level }, (_, i) => i + 1);
  // the deeper the level, the fainter its pill (the program has three at most)
  const tint = ["border-primary/45 bg-primary/22", "border-primary/33 bg-primary/16", "border-primary/21 bg-primary/10"];
  const chevron = (
    <span className="flex h-11 items-center">
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </span>
  );
  return (
    <Card round className="flex flex-col gap-4">
      {/* one level: its pill is the total already */}
      {levels.length > 1 && (
        <span className="text-xs font-semibold uppercase tracking-wide">
          {t("referral.networkTotal", { count: data.invited })}
        </span>
      )}
      <div className="flex items-start gap-1">
        <div className="flex flex-col items-center gap-1.5">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="size-5" />
          </span>
          <span className="text-xs font-semibold">{t("referral.you")}</span>
        </div>
        {levels.map((level, i) => (
          <Fragment key={level}>
            {chevron}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-full border text-base font-bold tabular-nums ${tint[i]}`}
              >
                <Users className="size-4 shrink-0 text-primary" />
                {data.countsByLevel[String(level)] ?? 0}
              </span>
              {/* one level is everyone invited, not a "1st level" */}
              <span className="truncate text-xs text-muted-foreground">
                {levels.length > 1 ? t("referral.levelN", { level }) : t("referral.invited")}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </Card>
  );
}

function ActionPill({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  // the same glass pill as "How does it work?" beside it (HowFolded), 64px with the home's corners
  return (
    <RippleButton
      type="button"
      onClick={onClick}
      className="relative flex h-16 w-full min-w-0 items-center justify-center gap-2 rounded-home px-6 text-base font-semibold text-foreground/80 transition-colors hover:bg-white/[0.06] glass-panel"
    >
      <Icon className="size-5 shrink-0" />
      <span className="truncate">{label}</span>
    </RippleButton>
  );
}

function Actions({ data }: { data: InviteData }) {
  const { t } = useTranslation();
  return <ActionPill icon={Users} label={t("pages.invited")} onClick={data.onInvited} />;
}

function useHowSteps(program: ReferralProgram): [LucideIcon, string, ReactNode][] {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const gift = program.invitee_reward_amount;
  const levels = Array.from({ length: program.max_level - 1 }, (_, i) => i + 2).filter(
    (level) => Number(program.reward_amounts[String(level)] ?? 0) > 0,
  );
  return [
    [Share2, t("referral.how.share"), t("referral.how.shareHint")],
    [
      UserPlus,
      t("referral.how.signup"),
      gift > 0
        ? t(program.invitee_reward_type === "POINTS" ? "referral.how.inviteePoints" : "referral.how.inviteeDays", {
            count: gift,
          })
        : t("referral.how.signupHint"),
    ],
    [
      CreditCard,
      t("referral.how.pay"),
      <>
        {t("referral.how.payTerms", { terms: rewardTerms(program, t, locale) })}. {t(`referral.how.${program.accrual_strategy}`)}
        {levels.length > 0 && (
          <span className="mt-1.5 block">
            {t("referral.how.levels")}
            {levels.map((level) => (
              <span key={level} className="block">
                {t("referral.how.level", { level, terms: rewardTerms(program, t, locale, level) })}
              </span>
            ))}
          </span>
        )}
      </>,
    ],
    program.reward_type === "POINTS"
      ? [Coins, t("referral.how.usePoints"), t("referral.how.usePointsHint")]
      : [CalendarPlus, t("referral.how.useDays"), t("referral.how.useDaysHint")],
  ];
}

function HowRail({ program }: { program: ReferralProgram }) {
  const { t } = useTranslation();
  const steps = useHowSteps(program);
  return (
    <ol className="flex flex-col">
      {steps.map(([Icon, title, hint], i) => {
        const last = i === steps.length - 1;
        return (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              {!last && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className={`flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5 ${last ? "" : "pb-5"}`}>
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </div>
          </li>
        );
      })}
      <li className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{t("referral.how.note")}</li>
    </ol>
  );
}

function HowFolded({ program }: { program: ReferralProgram }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    // closed, a pill as tall as the lg button under it: 64px, so the home's 32px corners round it off whole
    <div className="rounded-home glass-panel">
      <RippleButton
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
        className={`relative flex h-16 w-full items-center justify-center gap-2 px-6 text-base font-semibold text-foreground/80 transition-colors hover:bg-white/[0.06] ${
          open ? "rounded-t-home" : "rounded-home"
        }`}
      >
        <CircleHelp className="size-5 shrink-0" />
        <span className="truncate">{t("referral.how.title")}</span>
      </RippleButton>
      {/* 0fr → 1fr rows: the height glides to the content's; inert keeps the folded steps out of focus */}
      <div
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 lg:px-4 lg:pb-4">
            <HowRail program={program} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteCard({ data }: { data: InviteData }) {
  const { t, i18n } = useTranslation();
  return (
    <Card round className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* the panel Section's header: a 36px glass circle, a 16px title over a 12px line */}
        <span className={`${ICON_CIRCLE_CLASS} text-foreground`}>
          <Gift className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-base font-semibold tracking-tight">{t("referral.title")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("referral.earnTerms", { terms: rewardTerms(data.program, t, i18n.language) })}
          </span>
        </div>
      </div>
      <LinkField data={data} />
      <Button variant="solid" disabled={!data.main} onClick={data.onQr}>
        <QrCode className="size-4" />
        {t("referral.openQr")}
      </Button>
    </Card>
  );
}

export function InviteBlocks({ data }: { data: InviteData }) {
  return (
    <>
      <InviteCard data={data} />
      <NetworkChain data={data} />
      <BalanceTiles data={data} />
      <HowFolded program={data.program} />
      {data.invited > 0 && <Actions data={data} />}
    </>
  );
}

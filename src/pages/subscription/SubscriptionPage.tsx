import { ArrowUpRight, Gift, Globe, Percent, Plus, RefreshCw, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { useCatalogQuery } from "@entities/plan/api";
import { useReferralQuery } from "@entities/referral/api";
import { useMeQuery } from "@entities/session/api";
import { useCabinetSettingsQuery } from "@entities/shop/api";
import { useActivateTrial, useSubscriptionsQuery, useTrialQuery } from "@entities/subscription/api";
import { canBuyMore, canRenew, redeemTargets } from "@entities/subscription/lib";
import { formatNumber } from "@features/referral/links";
import { getErrorMessage } from "@shared/api/http";
import { haptic } from "@shared/telegram";
import { BrandLogo } from "@shared/ui/BrandLogo";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { KpiTile } from "@shared/ui/KpiTile";
import { Skeleton } from "@shared/ui/Skeleton";
import { DevicesCard } from "@widgets/devices/DevicesCard";
import { HeaderSlot } from "@widgets/page-header/HeaderSlot";
import { PromoDialog } from "@widgets/promo/PromoDialog";
import { RedeemDaysSheet } from "@widgets/redeem-days/RedeemDaysSheet";
import { CardsSlider, SlideCard } from "@widgets/subscription-cards/CardsSlider";
import { pickSelected } from "@widgets/subscription-cards/select";

function Header() {
  const { t } = useTranslation();
  const me = useMeQuery();
  const brand = t("app.name");
  return (
    <HeaderSlot>
      <div className="flex min-w-0 items-center gap-2.5">
        {/* the sidebar carries the brand on desktop */}
        <BrandLogo className="size-8 shrink-0 text-primary lg:hidden" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold lg:hidden">{brand}</div>
          {me.data && (
            <div className="truncate text-[11.5px] text-muted-foreground lg:text-[21px] lg:font-bold lg:tracking-tight lg:text-foreground">
              {t("home.welcome", { name: me.data.name })}
            </div>
          )}
        </div>
      </div>
    </HeaderSlot>
  );
}

// balances at a glance; zero points, a zero discount and a switched-off referral program stay out
// single layout: the tiles line up under the card (340px) and the two action columns beside it; two tiles just
// split the row (grid-cols-2)
const UNDER_CARD: Record<number, string> = {
  1: "sm:grid-cols-[340px]",
  3: "sm:grid-cols-[340px_repeat(2,minmax(0,1fr))]",
  4: "sm:grid-cols-[repeat(2,164px)_repeat(2,minmax(0,1fr))]",
};

function StatsRow({ className, single = false }: { className: string; single?: boolean }) {
  const { t, i18n } = useTranslation();
  const me = useMeQuery();
  const referral = useReferralQuery();
  const subscriptions = useSubscriptionsQuery();
  const [redeemOpen, setRedeemOpen] = useState(false);
  if (!me.data) return null;
  const bonusDays = me.data.bonus_days;
  // days to spend and a subscription that takes them
  const canRedeem = bonusDays > 0 && redeemTargets(subscriptions.data?.items ?? []).length > 0;
  // [label, value, the tile that takes the "apply" button]
  const stats: [string, string, boolean?][] = [];
  // the biggest of the three; the profile's balance card lists each one
  const discount = Math.max(me.data.personal_discount, me.data.purchase_discount, me.data.loyalty_discount);
  if (discount > 0) stats.push([t("home.discount"), `−${discount}%`]);
  stats.push([t("profile.bonusDays"), String(bonusDays), canRedeem]);
  if (Number(me.data.points) > 0) stats.push([t("profile.points"), formatNumber(me.data.points, i18n.language)]);
  if (referral.data?.program.enabled) {
    const invited = Object.values(referral.data.counts_by_level).reduce((sum, n) => sum + n, 0);
    stats.push([t("referral.invited"), String(invited)]);
  }
  return (
    <div
      className={`${className} grid grid-cols-2 gap-3 ${
        single ? UNDER_CARD[stats.length] : "lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none"
      }`}
    >
      {stats.map(([label, value, redeem]) => (
        <KpiTile
          key={label}
          label={label}
          value={value}
          tone={value.startsWith("−") ? "primary" : undefined}
          action={
            redeem && (
              <button
                type="button"
                onClick={() => setRedeemOpen(true)}
                className="-my-1 -mr-2 shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                {t("home.redeem")}
              </button>
            )
          }
        />
      ))}
      <RedeemDaysSheet open={redeemOpen} onClose={() => setRedeemOpen(false)} bonusDays={bonusDays} />
    </div>
  );
}

function ActionTile({
  to,
  icon: Icon,
  label,
  main,
  onClick,
}: {
  to?: string;
  icon: LucideIcon;
  label: string;
  main?: boolean;
  onClick?: () => void;
}) {
  // the KpiTile's box and height (16.5px eyebrow line + 6px + 39px value line + py-4 + 2px border), so the rows match
  const className = `flex min-h-[95.5px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-4 text-center text-[13px] font-medium leading-tight transition-colors ${
    main ? "border-primary/45 bg-primary/10 hover:bg-primary/15" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
  }`;
  const content = (
    <>
      <span
        className={`flex size-[34px] items-center justify-center rounded-full ${
          main ? "bg-primary text-primary-foreground" : "bg-primary/12 text-primary"
        }`}
      >
        <Icon className="size-4" />
      </span>
      {label}
    </>
  );
  return to ? (
    <Link to={to} onClick={onClick} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function EmptyState({ onActivated }: { onActivated: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const trial = useTrialQuery();
  const activate = useActivateTrial();
  return (
    <div className="flex flex-col gap-4">
      {trial.data?.is_available && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
            <Gift className="size-3.5 text-primary" />
            {t("home.trialTitle")}
          </div>
          <p className="text-sm text-muted-foreground">
            {trial.data.duration_days
              ? t("home.trialText", { plan: trial.data.plan_name ?? "", count: trial.data.duration_days })
              : t("home.trialTextShort")}
          </p>
          <Button
            variant="solid"
            disabled={activate.isPending}
            onClick={() => {
              haptic();
              activate.mutate(undefined, { onSuccess: onActivated });
            }}
          >
            {t("home.activate")}
          </Button>
          {activate.isError && (
            <p className="text-sm text-error">{getErrorMessage(activate.error, t("errors.generic"))}</p>
          )}
        </Card>
      )}
      <Card className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">{t("home.empty")}</p>
        <Button variant="accent" onClick={() => void navigate("/purchase")}>
          <Plus className="size-4" />
          {t("home.buy")}
        </Button>
      </Card>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="aspect-[1.586] w-[85%] max-w-[340px] rounded-[20px]" />
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[95.5px]" />
        ))}
      </div>
      <Skeleton className="h-28" />
    </div>
  );
}

export function SubscriptionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const subscriptions = useSubscriptionsQuery();
  const settings = useCabinetSettingsQuery();
  const catalog = useCatalogQuery();
  // the user's last pick; what's shown goes through pickSelected so a refetch can't strand it
  const [chosenId, setChosenId] = useState<number | null>(null);
  const [trialActivated, setTrialActivated] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const items = subscriptions.data?.items ?? [];
  const selectedId = pickSelected(
    chosenId,
    items.map((s) => s.id),
  );

  if (subscriptions.isPending || settings.isPending) return <HomeSkeleton />;
  if (subscriptions.isError || settings.isError) {
    return (
      <>
        <Header />
        <ErrorCard
          onRetry={() => {
            if (subscriptions.isError) void subscriptions.refetch();
            if (settings.isError) void settings.refetch();
          }}
        />
      </>
    );
  }

  const selected = items.find((s) => s.id === selectedId);
  const renewable = selected !== undefined && canRenew(selected, catalog.data?.items ?? []);

  // a user can only ever have this one subscription (an admin lowering the cap leaves extra ones in the slider)
  const single = settings.data.max_active_subscriptions === 1 && items.length === 1;
  const tiles = selected && (
    <>
      <ActionTile
        to={`/subscription/${selected.id}/connect`}
        icon={Globe}
        label={t("home.connect")}
        main
        onClick={haptic}
      />
      {/* without a plan to renew into, "renew" becomes "change plan"; no second tile for it */}
      {renewable && (
        <ActionTile
          to={`/purchase/${selected.plan_id}?type=RENEW&sub=${selected.id}`}
          icon={RefreshCw}
          label={t("home.renew")}
        />
      )}
      <ActionTile
        to={`/purchase?type=CHANGE&sub=${selected.id}`}
        icon={ArrowUpRight}
        label={t("home.changePlan")}
      />
      <ActionTile icon={Percent} label={t("home.promo")} onClick={() => setPromoOpen(true)} />
    </>
  );

  return (
    <>
      <Header />
      {trialActivated && <Card className="mb-4 text-sm text-success">{t("home.trialActivated")}</Card>}
      {!selected ? (
        <>
          <EmptyState onActivated={() => setTrialActivated(true)} />
          <StatsRow className="mt-4" />
        </>
      ) : (
        // desktop: cards across the frame, devices down to the frame's bottom
        <div className="flex flex-col lg:flex-1">
          {single ? (
            // one subscription per user: no slider, the actions stand beside the card in two rows
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-[340px] sm:shrink-0">
                <SlideCard sub={selected} index={0} />
              </div>
              <div className={`grid flex-1 gap-3 ${renewable ? "grid-cols-4" : "grid-cols-3"} sm:grid-cols-2 sm:grid-rows-2`}>
                {tiles}
              </div>
            </div>
          ) : (
            <div>
              <CardsSlider
                subscriptions={items}
                selectedId={selectedId}
                onSelect={setChosenId}
                canBuy={canBuyMore(settings.data.max_active_subscriptions, items.length)}
                onBuy={() => void navigate("/purchase")}
              />
              <div className={`grid gap-3 ${renewable ? "grid-cols-4" : "grid-cols-3"}`}>{tiles}</div>
            </div>
          )}
          {/* the panel's dashboard: 16px between rows, 12px inside one */}
          <StatsRow className="mt-4" single={single} />
          <div className="mt-4 lg:flex lg:flex-1 lg:flex-col lg:*:flex-1">
            <DevicesCard key={selected.id} subscription={selected} />
          </div>
        </div>
      )}
      <PromoDialog open={promoOpen} onClose={() => setPromoOpen(false)} />
    </>
  );
}

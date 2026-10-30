import { Gift, Percent, RefreshCw, Settings2, ShoppingCart, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useSearchParams } from "react-router";

import { useBrandName } from "@entities/appearance/api";
import { BrandMark } from "@entities/appearance/BrandMark";
import { useCatalogQuery } from "@entities/plan/api";
import { invitedCount, useRedeemTargetsQuery, useReferralQuery } from "@entities/referral/api";
import { maxDiscount, useMeQuery } from "@entities/session/api";
import { useCabinetSettingsQuery } from "@entities/shop/api";
import { useActivateTrial, useSubscriptionsQuery, useTrialQuery } from "@entities/subscription/api";
import { canBuyMore, canRenew, cardNotice } from "@entities/subscription/lib";
import { getErrorMessage } from "@shared/api/http";
import { formatDate, formatMoney, formatNumber } from "@shared/lib/format";
import { haptic } from "@shared/telegram";
import { ActionTile } from "@shared/ui/ActionTile";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { KpiTile } from "@shared/ui/KpiTile";
import { Skeleton } from "@shared/ui/Skeleton";
import { PulseButton } from "@shared/ui/PulseButton";
import { FormError } from "@shared/ui/FormError";
import { SuccessMessage } from "@shared/ui/SuccessCheck";
import { CARD_ASPECT } from "@widgets/subscription-cards/card-aspect";
import { DevicesCard } from "@widgets/devices/DevicesCard";
import { HeaderSlot } from "@widgets/page-header/HeaderSlot";
import { PromoDialog } from "@widgets/promo/PromoDialog";
import { RedeemDaysSheet } from "@widgets/redeem-days/RedeemDaysSheet";
import { CardsSlider } from "@widgets/subscription-cards/CardsSlider";
import { pickSelected } from "@widgets/subscription-cards/select";
import { Hero } from "@pages/connect/HeroArt";

import { LogoArt } from "./EmptyArt";

function Header() {
  const { t } = useTranslation();
  const me = useMeQuery();
  const brand = useBrandName();
  return (
    <HeaderSlot>
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark className="size-8 shrink-0 text-primary lg:hidden" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold lg:hidden">{brand}</div>
          {me.data && (
            <div className="truncate text-[12px] text-muted-foreground lg:text-[21px] lg:font-bold lg:tracking-tight lg:text-foreground">
              {t("home.welcome", { name: me.data.name })}
            </div>
          )}
        </div>
      </div>
    </HeaderSlot>
  );
}

// balances at a glance, desktop only; zero points, a zero discount and a switched-off referral program stay out
function StatsRow({ className }: { className: string }) {
  const { t, i18n } = useTranslation();
  const me = useMeQuery();
  const referral = useReferralQuery();
  const [redeemOpen, setRedeemOpen] = useState(false);
  const redeemTargets = useRedeemTargetsQuery((me.data?.bonus_days ?? 0) > 0);
  if (!me.data) return null;
  const bonusDays = me.data.bonus_days;
  // days to spend and a subscription that takes them
  const canRedeem = bonusDays > 0 && (redeemTargets.data?.subscription_ids.length ?? 0) > 0;
  // [label, value, the tile that takes the "apply" button]
  const stats: [string, string, boolean?][] = [];
  // the biggest of the three; the profile's balance card lists each one
  const discount = maxDiscount(me.data);
  if (discount > 0) stats.push([t("home.discount"), `−${discount}%`]);
  stats.push([t("profile.bonusDays"), String(bonusDays), canRedeem]);
  if (Number(me.data.points) > 0) stats.push([t("profile.points"), formatNumber(me.data.points, i18n.language)]);
  if (referral.data?.program.enabled) {
    stats.push([t("referral.invited"), String(invitedCount(referral.data.counts_by_level))]);
  }
  return (
    <div
      className={`${className} grid grid-cols-2 gap-3 max-lg:hidden lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none`}
    >
      {stats.map(([label, value, redeem]) => (
        <KpiTile
          round
          key={label}
          label={label}
          value={value}
          tone={value.startsWith("−") ? "primary" : undefined}
          action={
            redeem && (
              // -my-2: the 32px button overhangs the eyebrow's line, so the tile keeps its neighbours' height
              <Button variant="secondary" size="sm" className="-my-2 shrink-0" onClick={() => setRedeemOpen(true)}>
                {t("home.redeem")}
              </Button>
            )
          }
        />
      ))}
      <RedeemDaysSheet open={redeemOpen} onClose={() => setRedeemOpen(false)} bonusDays={bonusDays} />
    </div>
  );
}

// the desktop row by its tile count (2–4): the classes spelled out for Tailwind
const ROW_GRID: Record<number, string> = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

/** No subscription yet: the connect guide's full-screen hero, the trial first when there is one, then buying. */
function EmptyState({ onActivated }: { onActivated: () => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const trial = useTrialQuery();
  const activate = useActivateTrial();
  const offer = trial.data?.is_available ? trial.data : null;
  // a paid trial: its days for the hint, its price on the button, the checkout behind it
  const paid =
    offer && !offer.is_free && offer.plan_id !== null && offer.price !== null && offer.currency !== null
      ? { planId: offer.plan_id, price: formatMoney(offer.price, offer.currency, i18n.language) }
      : null;
  const hint = !offer
    ? t("home.emptyHint")
    : !offer.duration_days
      ? t("home.trialTextShort")
      : paid
        ? t("home.trialPaidText", { count: offer.duration_days })
        : t("home.trialText", { count: offer.duration_days });
  return (
    <Hero title={t("home.empty")} hint={hint} art={<LogoArt />} lower>
      {offer ? (
        <>
          {paid ? (
            <PulseButton to={`/purchase/${paid.planId}`}>
              <Gift className="size-5" />
              {t("home.tryFor", { price: paid.price })}
            </PulseButton>
          ) : (
          <PulseButton
            onClick={() => {
              if (activate.isPending) return;
              haptic();
              activate.mutate(undefined, { onSuccess: onActivated });
            }}
          >
            <Gift className="size-5" />
            {t("home.tryFree")}
          </PulseButton>
          )}
          <Button variant="outline" size="lg" onClick={() => void navigate("/purchase")}>
            <ShoppingCart className="size-5" />
            {t("home.buy")}
          </Button>
          {activate.isError && (
            <FormError>{getErrorMessage(activate.error, t("errors.generic"))}</FormError>
          )}
        </>
      ) : (
        <PulseButton to="/purchase">
          <ShoppingCart className="size-5" />
          {t("home.buy")}
        </PulseButton>
      )}
    </Hero>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton round className={`${CARD_ASPECT} w-full max-w-[340px] sm:w-[85%]`} />
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          // the first stands for "connect": a 64px pill on a phone, a tile beside the others on desktop
          <Skeleton
            round
            key={i}
            className={
              i === 0 ? "col-span-full h-16 max-lg:rounded-full lg:col-span-1 lg:h-[95.5px]" : "h-[95.5px]"
            }
          />
        ))}
      </div>
      <Skeleton round className="h-28" />
    </div>
  );
}

export function SubscriptionPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const subscriptions = useSubscriptionsQuery();
  const settings = useCabinetSettingsQuery();
  // the user's last pick; what's shown goes through pickSelected so a refetch can't strand it
  // a notification link opens on its subscription (`?sub=`), and `renew=1` goes straight on to renewing it
  const [params, setParams] = useSearchParams();
  const [chosenId, setChosenId] = useState<number | null>(() => Number(params.get("sub")) || null);
  const [trialActivated, setTrialActivated] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  // fixed per mount, as on the cards
  const [now] = useState(() => new Date());
  const items = subscriptions.data?.items ?? [];
  const selectedId = pickSelected(
    chosenId,
    items.map((s) => s.id),
  );
  // the plan the selected subscription renews into, as the backend decides (a link plan, one closed to new buyers)
  const catalog = useCatalogQuery({ plan_code: null, renew_subscription_id: selectedId });
  const linkedId = Number(params.get("sub")) || null;
  const renewLink = params.get("renew") === "1";
  const subsLoaded = subscriptions.isSuccess;
  const linkedFound = linkedId !== null && items.some((s) => s.id === linkedId);
  // a link followed while home is already open doesn't remount the page: adopt it when the param changes
  const [seenLinkedId, setSeenLinkedId] = useState(linkedId);
  if (linkedId !== seenLinkedId) {
    setSeenLinkedId(linkedId);
    if (linkedFound) setChosenId(linkedId);
  }
  // the param is consumed once the list is in; a renewal link stays until the redirect below leaves the page
  useEffect(() => {
    if (!subsLoaded || (renewLink && linkedFound)) return;
    const next = new URLSearchParams(params);
    next.delete("sub");
    next.delete("renew");
    if (next.size !== params.size) setParams(next, { replace: true });
  }, [subsLoaded, renewLink, linkedFound, params, setParams]);

  if (subscriptions.isPending || settings.isPending) return <HomeSkeleton />;
  if ((subscriptions.isError && !subscriptions.data) || (settings.isError && !settings.data)) {
    return (
      <>
        <Header />
        <ErrorCard
          round
          error={subscriptions.error ?? settings.error}
          onRetry={() => {
            if (subscriptions.isError) void subscriptions.refetch();
            if (settings.isError) void settings.refetch();
          }}
        />
      </>
    );
  }

  const selected = items.find((s) => s.id === selectedId);
  // the catalog didn't load: offer "renew" anyway (a trial never), the wizard says so if its plan is gone
  const renewable =
    selected !== undefined && (catalog.isError && !catalog.data ? !selected.is_trial : canRenew(selected, catalog.data?.items ?? []));
  // without a plan to renew into, changing the plan stands for renewing
  const renewTo =
    selected &&
    (renewable
      ? `/purchase/${selected.plan_id}?type=RENEW&sub=${selected.id}`
      : `/purchase?type=CHANGE&sub=${selected.id}`);
  // no days or no traffic left: a new device would get no connection, so "connect" is gone until a renewal
  const notice = selected && cardNotice(selected, now);
  const cutOff = notice === "expired" || notice === "trafficOut" || notice === "expiredTraffic";
  // the tiles side by side (connect among them): one row across the frame
  const tileCount = (cutOff ? 0 : 1) + (renewable ? 1 : 0) + 2;

  // a user can only ever have this one subscription (an admin lowering the cap leaves extra ones in the slider)
  const single = settings.data.max_active_subscriptions === 1 && items.length === 1;
  // a phone gets "connect" as the connect guide's pulsing button, a row of its own above the rest; from lg up, where
  // the tiles go side by side, it is a tile among them
  const tiles = selected && (
    <>
      {!cutOff && (
        <>
          <PulseButton to={`/subscription/${selected.id}/connect`} className="col-span-full lg:hidden">
            <Unplug className="size-5" />
            {t("home.connect")}
          </PulseButton>
          <ActionTile
            round
            to={`/subscription/${selected.id}/connect`}
            icon={Unplug}
            label={t("home.connect")}
            main
            className="max-lg:hidden"
            onClick={haptic}
          />
        </>
      )}
      {renewable && (
        <ActionTile
          round
          to={renewTo}
          icon={RefreshCw}
          label={t("home.renew")}
        />
      )}
      <ActionTile
        round
        to={`/purchase?type=CHANGE&sub=${selected.id}`}
        icon={Settings2}
        label={t("home.changePlan")}
      />
      <ActionTile round icon={Percent} label={t("home.promo")} onClick={() => setPromoOpen(true)} />
    </>
  );

  return (
    <>
      {renewLink && selected && selected.id === linkedId && !catalog.isPending && renewTo && (
        <Navigate replace to={renewTo} />
      )}
      <Header />
      <BottomSheet
        bare
        open={trialActivated}
        onClose={() => setTrialActivated(false)}
        title={t("home.trialTitle")}
      >
        <SuccessMessage
          hint={selected && t("home.trialActivatedHint", { date: formatDate(selected.expire_at, i18n.language) })}
        >
          {t("home.trialActivated")}
        </SuccessMessage>
        <Button variant="outline" size="lg" className="mt-6 w-full" onClick={() => setTrialActivated(false)}>
          {t("common.continue")}
        </Button>
      </BottomSheet>
      {!selected ? (
        <>
          <EmptyState onActivated={() => setTrialActivated(true)} />
          <StatsRow className="mt-4" />
        </>
      ) : (
        <div className="flex flex-col lg:flex-1">
          <div>
            <CardsSlider
              subscriptions={items}
              selectedId={selectedId}
              onSelect={setChosenId}
              single={single}
              canBuy={canBuyMore(settings.data.max_active_subscriptions, items)}
              onBuy={() => void navigate("/purchase")}
              renewTo={renewTo}
            />
            <div className={`grid gap-3 ${renewable ? "grid-cols-3" : "grid-cols-2"} ${ROW_GRID[tileCount]}`}>
              {tiles}
            </div>
          </div>
          <StatsRow className="mt-4" />
          <div className="mt-4 lg:flex lg:flex-1 lg:flex-col lg:*:flex-1">
            <DevicesCard key={selected.id} subscription={selected} />
          </div>
        </div>
      )}
      <PromoDialog open={promoOpen} onClose={() => setPromoOpen(false)} />
    </>
  );
}

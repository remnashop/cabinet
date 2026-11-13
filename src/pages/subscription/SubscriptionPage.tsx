import { Gift, House, Percent, RefreshCw, Settings2, ShoppingCart, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useMatch, useNavigate, useSearchParams } from "react-router";

import { useBrandName } from "@entities/appearance/api";
import { BrandMark } from "@entities/appearance/BrandMark";
import { useCatalogQuery } from "@entities/plan/api";
import { useMeQuery } from "@entities/session/api";
import { useCabinetSettingsQuery } from "@entities/shop/api";
import { useActivateTrial, useSubscriptionsQuery, useTrialQuery } from "@entities/subscription/api";
import { canBuyMore, canRenew, cardNotice } from "@entities/subscription/lib";
import { getErrorMessage } from "@shared/api/http";
import { formatDate, formatMoney } from "@shared/lib/format";
import { haptic } from "@shared/telegram";
import { ActionTile } from "@shared/ui/ActionTile";
import { Modal } from "@shared/ui/Modal";
import { Button } from "@shared/ui/Button";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { Skeleton } from "@shared/ui/Skeleton";
import { PulseButton } from "@shared/ui/PulseButton";
import { FormError } from "@shared/ui/FormError";
import { SuccessMessage } from "@shared/ui/SuccessCheck";
import { CARD_ASPECT_SHORT } from "@widgets/subscription-cards/card-aspect";
import { DevicesCard } from "@widgets/devices/DevicesCard";
import { HeaderSlot } from "@widgets/page-header/HeaderSlot";
import { HeaderIcon } from "@widgets/page-header/PageHeader";
import { PromoDialog } from "@widgets/promo/PromoDialog";
import { CardsSlider } from "@widgets/subscription-cards/CardsSlider";
import { NoticeBar } from "@widgets/subscription-cards/SubscriptionCard";
import { pickSelected } from "@widgets/subscription-cards/select";
import { Hero } from "@pages/connect/HeroArt";

import { LogoArt } from "./EmptyArt";
import { markPushPromptEligible } from "@features/push-prompt/push-prompt";
import { PushPromptCard } from "@features/push-prompt/PushPromptCard";

function Header() {
  const { t } = useTranslation();
  const me = useMeQuery();
  const brand = useBrandName();
  return (
    <HeaderSlot>
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark className="size-8 shrink-0 text-primary lg:hidden" />
        <HeaderIcon icon={House} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold lg:hidden">{brand}</div>
          {me.data && (
            <div className="truncate text-xs text-muted-foreground lg:text-lg lg:font-semibold lg:tracking-tight lg:text-foreground">
              {t("home.welcome", { name: me.data.name })}
            </div>
          )}
        </div>
      </div>
    </HeaderSlot>
  );
}

// alone on desktop: the card on the left half, the tiles 2×2 on the right, the notice strip (if any) under both.
// dense: the strip spans both columns, so it starts the second row and the tiles (after it in the DOM, for a phone)
// fill the gap beside the card
const SINGLE_ROW = "flex flex-col gap-5 lg:grid lg:grid-flow-dense lg:grid-cols-2";

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
          <Button variant="glass" size="lg" onClick={() => void navigate("/purchase")}>
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

// the page's own rows: the slider (one card on a phone, three across on desktop), the tiles, the devices
function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} corners="rounded-subscription" className={`${CARD_ASPECT_SHORT} w-full min-w-0 ${i ? "max-lg:hidden" : ""}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5 lg:grid-cols-4">
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
  // the page keeps rendering while it fades out (AnimatedOutlet), on the next page's address: it rewrites the address
  // only while it's its own, or a renewal's `?type=RENEW&sub=` would lose its `sub` on the way to the wizard
  const isHome = useMatch("/") !== null;
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
    if (!isHome || !subsLoaded || (renewLink && linkedFound)) return;
    const next = new URLSearchParams(params);
    next.delete("sub");
    next.delete("renew");
    if (next.size !== params.size) setParams(next, { replace: true });
  }, [isHome, subsLoaded, renewLink, linkedFound, params, setParams]);

  if (subscriptions.isPending || settings.isPending) {
    return (
      <>
        <Header />
        <HomeSkeleton />
      </>
    );
  }
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
  // no days or no traffic left, or switched off by the admin: a new device would get no connection, so "connect" is
  // gone until a renewal (or the admin turns it back on)
  const notice = selected && cardNotice(selected, now);
  const cutOff =
    notice === "expired" ||
    notice === "trafficOut" ||
    notice === "expiredTraffic" ||
    notice === "disabled" ||
    notice === "deleted";
  // a user can only ever have this one subscription (an admin lowering the cap leaves extra ones in the slider)
  const single = settings.data.max_active_subscriptions === 1 && items.length === 1;
  // the tiles side by side (connect among them): one row across the frame. Alone, the card takes the left half on
  // desktop and the tiles go 2×2 beside it: "connect" stays there dimmed while it's cut off, so the grid holds
  const tileCount = (cutOff && !single ? 0 : 1) + (renewable ? 1 : 0) + 2;
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
      {cutOff && single && <ActionTile round icon={Unplug} label={t("home.connect")} disabled className="max-lg:hidden" />}
      {renewable && (
        <ActionTile
          round
          to={renewTo}
          icon={RefreshCw}
          label={t("home.renew")}
          desktopLabel={t("home.renewDesktop")}
        />
      )}
      <ActionTile
        round
        to={`/purchase?type=CHANGE&sub=${selected.id}`}
        icon={Settings2}
        label={t("home.changePlan")}
        desktopLabel={t("home.changePlanDesktop")}
      />
      {/* 2×2 with one short (nothing to renew into): the last one takes the row */}
      <ActionTile
        round
        icon={Percent}
        label={t("home.promo")}
        desktopLabel={t("home.promoDesktop")}
        onClick={() => setPromoOpen(true)}
        className={single && tileCount % 2 ? "lg:col-span-2" : ""}
      />
    </>
  );

  return (
    <>
      {renewLink && selected && selected.id === linkedId && !catalog.isPending && renewTo && (
        <Navigate replace to={renewTo} />
      )}
      <Header />
      <Modal
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
        <Button variant="glass" size="lg" className="mt-6 w-full" onClick={() => setTrialActivated(false)}>
          {t("common.continue")}
        </Button>
      </Modal>
      {!selected ? (
        <EmptyState
          onActivated={() => {
            markPushPromptEligible();
            setTrialActivated(true);
          }}
        />
      ) : (
        <div className="flex flex-col lg:flex-1">
          {/* alone on desktop: the card and the tiles side by side, its strip under both */}
          <div className={single ? SINGLE_ROW : "flex flex-col gap-5"}>
            <div>
              <CardsSlider
                subscriptions={items}
                selectedId={selectedId}
                onSelect={setChosenId}
                single={single}
                canBuy={canBuyMore(settings.data.max_active_subscriptions, items)}
                onBuy={() => void navigate("/purchase")}
              />
            </div>
            {/* the strip decides for itself, on its own clock (the page's is the one it mounted with); none: no row */}
            <div className={single ? "empty:hidden lg:col-span-2" : "empty:hidden"}>
              <NoticeBar sub={selected} to={renewTo} />
            </div>
            <div
              className={`grid gap-5 ${renewable ? "grid-cols-3" : "grid-cols-2"} ${
                single ? "lg:auto-rows-fr lg:grid-cols-2" : ROW_GRID[tileCount]
              }`}
            >
              {tiles}
            </div>
          </div>

          {/* right after a purchase or a trial, once per browser */}
          <PushPromptCard />
          <div className="mt-5 lg:flex lg:flex-1 lg:flex-col lg:*:flex-1">
            <DevicesCard key={selected.id} subscription={selected} canConnect={!cutOff} />
          </div>
        </div>
      )}
      <PromoDialog open={promoOpen} onClose={() => setPromoOpen(false)} />
    </>
  );
}

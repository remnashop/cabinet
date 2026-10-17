import { ArrowUpRight, Gift, Percent, Plus, Power, QrCode, RefreshCw, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { useCatalogQuery } from "@entities/plan/api";
import { useMeQuery } from "@entities/session/api";
import { useCabinetSettingsQuery } from "@entities/shop/api";
import { useActivateTrial, useDevicesQuery, useSubscriptionsQuery, useTrialQuery } from "@entities/subscription/api";
import { canBuyMore, canRenew } from "@entities/subscription/lib";
import { getErrorMessage } from "@shared/api/http";
import { haptic } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { Skeleton } from "@shared/ui/Skeleton";
import { DevicesCard } from "@widgets/devices/DevicesCard";
import { CardsSlider } from "@widgets/subscription-cards/CardsSlider";
import { pickSelected } from "@widgets/subscription-cards/select";

const ROUND_BUTTON = "flex size-9 items-center justify-center rounded-full border transition-colors";

function Header() {
  const { t } = useTranslation();
  const me = useMeQuery();
  const brand = t("app.name");
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-primary to-cyan-700 font-extrabold text-primary-foreground">
          {brand.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{brand}</div>
          {me.data && (
            <div className="truncate text-[11.5px] text-muted-foreground">
              {t("home.welcome", { name: me.data.name })}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link
          to="/purchase"
          aria-label={t("home.buy")}
          className={`${ROUND_BUTTON} border-primary/40 bg-primary/15 text-primary hover:bg-primary/25`}
        >
          <Plus className="size-4" />
        </Link>
        <Link
          to="/promo"
          aria-label={t("home.promo")}
          className={`${ROUND_BUTTON} border-border bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]`}
        >
          <Percent className="size-4" />
        </Link>
      </div>
    </header>
  );
}

function ActionTile({
  to,
  icon: Icon,
  label,
  main,
  onClick,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  main?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-2.5 text-center text-[10.5px] font-medium transition-colors ${
        main
          ? "border-primary/45 bg-primary/10 hover:bg-primary/15"
          : "border-border bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <span
        className={`flex size-[34px] items-center justify-center rounded-full ${
          main ? "bg-primary text-primary-foreground" : "bg-primary/12 text-primary"
        }`}
      >
        <Icon className="size-4" />
      </span>
      {label}
    </Link>
  );
}

function EmptyState({ onActivated }: { onActivated: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const trial = useTrialQuery();
  const activate = useActivateTrial();
  return (
    <div className="flex flex-col gap-3">
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
    <div className="flex flex-col gap-3">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="aspect-[1.586] w-[85%] max-w-[340px] rounded-[20px]" />
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[68px]" />
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
  const items = subscriptions.data?.items ?? [];
  const selectedId = pickSelected(
    chosenId,
    items.map((s) => s.id),
  );
  const devices = useDevicesQuery(selectedId);

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

  return (
    <>
      <Header />
      {trialActivated && <Card className="mb-3 text-sm text-success">{t("home.trialActivated")}</Card>}
      {!selected ? (
        <EmptyState onActivated={() => setTrialActivated(true)} />
      ) : (
        <div className="flex flex-col gap-1 lg:grid lg:grid-cols-[400px_1fr] lg:items-start lg:gap-6">
          <div>
            <CardsSlider
              subscriptions={items}
              selectedId={selectedId}
              onSelect={setChosenId}
              canBuy={canBuyMore(settings.data.max_active_subscriptions, items.length)}
              onBuy={() => void navigate("/purchase")}
              devicesUsed={devices.data?.total}
            />
            <div className={`grid gap-2 ${renewable ? "grid-cols-4" : "grid-cols-3"}`}>
              <ActionTile
                to={`/subscription/${selected.id}/connect`}
                icon={Power}
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
              <ActionTile to={`/subscription/${selected.id}/connect`} icon={QrCode} label={t("home.linkQr")} />
            </div>
          </div>
          <div className="mt-3 lg:mt-0">
            <DevicesCard key={selected.id} subscription={selected} />
          </div>
        </div>
      )}
    </>
  );
}

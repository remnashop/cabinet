import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { redeemDays, type RedeemDaysResult } from "@entities/referral/api";
import { useSubscriptionsQuery } from "@entities/subscription/api";
import { getErrorMessage } from "@shared/api/http";
import { haptic } from "@shared/telegram";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { SuffixInput } from "@shared/ui/TextInput";
import { SubscriptionCard } from "@widgets/subscription-cards/SubscriptionCard";

// the backend's MAX_BONUS_DAYS
const MAX_DAYS = 3650;

interface Props {
  open: boolean;
  onClose: () => void;
  bonusDays: number;
}

export function RedeemDaysSheet({ open, onClose, bonusDays }: Props) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const subscriptions = useSubscriptionsQuery();
  const [picked, setPicked] = useState<number | null>(null);
  const [days, setDays] = useState("");
  const [result, setResult] = useState<RedeemDaysResult | null>(null);

  const max = Math.min(bonusDays, MAX_DAYS);
  // the backend renews EXPIRED ones too; it refuses trials, disabled and deleted
  const targets =
    subscriptions.data?.items.filter((s) => !s.is_trial && s.status !== "DELETED" && s.status !== "DISABLED") ?? [];
  const subscriptionId = picked ?? (targets.length === 1 ? targets[0].id : null);
  const count = days === "" ? max : Number(days);
  const valid = Number.isInteger(count) && count >= 1 && count <= max;

  const redeem = useMutation({
    mutationFn: redeemDays,
    onSuccess: (data) => {
      setResult(data);
      void client.invalidateQueries({ queryKey: ["referral"] });
      void client.invalidateQueries({ queryKey: ["me"] });
      void client.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });

  const close = () => {
    onClose();
    setPicked(null);
    setDays("");
    setResult(null);
    redeem.reset();
  };

  return (
    <BottomSheet open={open} onClose={close} title={t("referral.redeemTitle")}>
      {result ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{result.pending ? t("referral.redeemPending") : t("referral.redeemed")}</p>
          <Button variant="outline" onClick={close}>
            {t("referral.done")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("referral.pickSubscription")}
          </p>
          {targets.length === 0 && !subscriptions.isPending && (
            <p className="text-sm text-muted-foreground">{t("referral.noSubscriptions")}</p>
          )}
          {targets.map((sub, i) => (
            <button
              key={sub.id}
              type="button"
              aria-pressed={sub.id === subscriptionId}
              className={`rounded-[22px] text-left outline-2 outline-offset-2 ${sub.id === subscriptionId ? "outline-primary" : "outline-transparent"}`}
              onClick={() => setPicked(sub.id)}
            >
              <SubscriptionCard sub={sub} index={i} compact />
            </button>
          ))}
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("referral.daysLabel", { max })}
            <SuffixInput
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              step={1}
              value={days}
              placeholder={String(max)}
              suffix={t("referral.daysUnit")}
              onChange={(e) => {
                setDays(e.target.value);
                redeem.reset();
              }}
            />
          </label>
          {redeem.isError && <p className="text-sm text-error">{getErrorMessage(redeem.error, t("errors.generic"))}</p>}
          <Button
            variant="solid"
            disabled={subscriptionId === null || !valid || redeem.isPending}
            onClick={() => {
              if (subscriptionId === null) return;
              haptic();
              redeem.mutate({ subscription_id: subscriptionId, days: count });
            }}
          >
            {t("referral.apply")}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

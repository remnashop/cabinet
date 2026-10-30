import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarPlus, CircleCheck, Minus, Plus, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { redeemDays, useRedeemTargetsQuery, type RedeemDaysResult } from "@entities/referral/api";
import { useSubscriptionsQuery, type OwnSubscription } from "@entities/subscription/api";
import { subscriptionNumber } from "@entities/subscription/lib";
import { getErrorMessage } from "@shared/api/http";
import { formatDate } from "@shared/lib/format";
import { haptic } from "@shared/telegram";
import { AlertMark } from "@shared/ui/AlertMark";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { NotePill } from "@shared/ui/NotePill";
import { SuccessMessage } from "@shared/ui/SuccessCheck";
import { OptionRow } from "@shared/ui/OptionRow";
import { FormError } from "@shared/ui/FormError";

// the backend's MAX_BONUS_DAYS
const MAX_DAYS = 3650;
const DAY_MS = 86_400_000;

interface Props {
  open: boolean;
  onClose: () => void;
  bonusDays: number;
}

function TargetRow({ sub, picked, onPick }: { sub: OwnSubscription; picked: boolean; onPick: () => void }) {
  const { t, i18n } = useTranslation();
  return (
    <OptionRow selected={picked} onClick={onPick}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
        <Zap className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-semibold">{sub.plan_name}</span>
        <span className="truncate text-[12px] text-muted-foreground">
          {subscriptionNumber(sub.id)} · {t("home.until", { date: formatDate(sub.expire_at, i18n.language) })}
        </span>
      </span>
      {picked && <CircleCheck className="size-5 shrink-0 text-primary" />}
    </OptionRow>
  );
}

/** Bonus days onto a subscription: which one, how many (a stepper that also takes a typed number), and its new end. */
export function RedeemDaysSheet({ open, onClose, bonusDays }: Props) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const subscriptions = useSubscriptionsQuery();
  const [picked, setPicked] = useState<number | null>(null);
  const [days, setDays] = useState("");
  const [result, setResult] = useState<RedeemDaysResult | null>(null);
  // fixed per mount: the preview needn't tick while the sheet is open
  const [now] = useState(() => Date.now());

  const max = Math.min(bonusDays, MAX_DAYS);
  // the backend says which ones the days can extend; the rows come from the subscriptions list
  const targetIds = useRedeemTargetsQuery(open);
  const loaded = subscriptions.data !== undefined && targetIds.data !== undefined;
  const targets = loaded
    ? subscriptions.data.items.filter((s) => targetIds.data.subscription_ids.includes(s.id))
    : [];
  const target = targets.find((s) => s.id === picked) ?? (targets.length === 1 ? targets[0] : undefined);
  const shownDays = days === "" ? String(max) : days;
  const count = Number(shownDays);
  const valid = Number.isInteger(count) && count >= 1 && count <= max;
  // an expired subscription restarts from today, as the backend extends it
  const newEnd =
    target && valid ? new Date(Math.max(Date.parse(target.expire_at), now) + count * DAY_MS).toISOString() : null;

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
  const step = (by: number) => {
    haptic();
    setDays(String(Math.min(max, Math.max(1, (valid ? count : max) + by))));
    redeem.reset();
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!target || !valid) return;
    haptic();
    redeem.mutate({ subscription_id: target.id, days: count });
  };

  return (
    <BottomSheet
      narrow
      bare={result !== null}
      icon={CalendarPlus}
      open={open}
      onClose={close}
      title={t("referral.redeemTitle")}
    >
      {result ? (
        <>
          <SuccessMessage
            hint={
              result.pending
                ? t("referral.redeemPending")
                : t("referral.redeemedUntil", { date: formatDate(result.expire_at, i18n.language) })
            }
          >
            {t("referral.redeemedTitle")}
          </SuccessMessage>
          <Button variant="outline" size="lg" className="mt-6 w-full" onClick={close}>
            {t("common.continue")}
          </Button>
        </>
      ) : loaded && targets.length === 0 ? (
        // nothing the days can extend: no question to answer
        <>
          <div className="flex flex-col items-center gap-3 pt-4 text-center">
            <AlertMark tone="warning" />
            <p className="text-sm text-muted-foreground">{t("referral.noTargetTitle")}</p>
          </div>
          <Button variant="outline" className="mt-5 w-full" onClick={close}>
            {t("common.close")}
          </Button>
        </>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("referral.pickSubscription")}
            </h3>
            {targets.map((sub) => (
              <TargetRow key={sub.id} sub={sub} picked={sub.id === target?.id} onPick={() => setPicked(sub.id)} />
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("referral.howMany")}
              </h3>
              <span className="text-[12px] text-muted-foreground">{t("referral.available", { count: max })}</span>
            </div>
            <div
              className={`flex items-center gap-2 rounded-2xl border bg-white/[0.03] py-2 pr-2 pl-4 ${
                valid ? "border-white/[0.08]" : "border-error"
              }`}
            >
              <label className="flex min-w-0 flex-1 items-baseline gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={max}
                  value={shownDays}
                  aria-invalid={!valid}
                  aria-label={t("referral.howMany")}
                  onChange={(e) => {
                    setDays(e.target.value);
                    redeem.reset();
                  }}
                  // as wide as its digits, so the word sits right after the number
                  style={{ width: `${Math.max(1, shownDays.length)}ch` }}
                  className="min-w-0 bg-transparent text-[26px] font-bold tabular-nums tracking-tight outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="truncate text-sm text-muted-foreground">
                  {t("referral.daysWord", { count: valid ? count : max })}
                </span>
              </label>
              <Button variant="secondary" size="sm" disabled={count === max} onClick={() => setDays("")}>
                {t("referral.max")}
              </Button>
              <Button variant="outline" size="sm" bounce={false} aria-label={t("referral.fewer")} disabled={valid && count <= 1} onClick={() => step(-1)}>
                <Minus className="size-4" />
              </Button>
              <Button variant="outline" size="sm" bounce={false} aria-label={t("referral.more")} disabled={valid && count >= max} onClick={() => step(1)}>
                <Plus className="size-4" />
              </Button>
            </div>
            {!valid && (
              <FormError>
                {count > max ? t("referral.tooMany", { count: max }) : t("referral.atLeastOne")}
              </FormError>
            )}
          </section>

          {newEnd && (
            <NotePill icon={CalendarClock}>{t("referral.newEnd", { date: formatDate(newEnd, i18n.language) })}</NotePill>
          )}
          {redeem.isError && <FormError>{getErrorMessage(redeem.error, t("errors.generic"))}</FormError>}
          <Button type="submit" variant="accent" className="mt-1" disabled={!target || !valid || redeem.isPending}>
            {t("referral.apply")}
          </Button>
        </form>
      )}
    </BottomSheet>
  );
}

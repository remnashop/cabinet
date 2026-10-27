import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Percent } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { activatePromocode, type PromocodeActivation } from "@entities/plan/api";
import { useSubscriptionsQuery } from "@entities/subscription/api";
import { ApiError, getErrorMessage } from "@shared/api/http";
import { haptic } from "@shared/telegram";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { TextInput } from "@shared/ui/TextInput";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { Skeleton } from "@shared/ui/Skeleton";
import { rewardText } from "@widgets/promo/reward-text";
import { SubscriptionCard } from "@widgets/subscription-cards/SubscriptionCard";

export function PromoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const subscriptions = useSubscriptionsQuery();
  const [code, setCode] = useState("");
  // the backend asked which subscription the reward goes to
  const [picking, setPicking] = useState(false);
  const [result, setResult] = useState<PromocodeActivation | null>(null);

  const activation = useMutation({
    mutationFn: (target?: number) => activatePromocode({ code: code.trim(), target_subscription_id: target }),
    onSuccess: (data) => {
      setPicking(false);
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err) => setPicking(err instanceof ApiError && err.code === "TARGET_SUBSCRIPTION_REQUIRED"),
  });

  const submit = (target?: number) => {
    haptic();
    activation.mutate(target);
  };

  // reopening starts from an empty field
  const close = () => {
    onClose();
    setCode("");
    setPicking(false);
    setResult(null);
    activation.reset();
  };

  // only subscriptions a reward can be applied to
  const targets = subscriptions.data?.items.filter((s) => s.status === "ACTIVE" || s.status === "LIMITED");
  const error = activation.error && !picking ? getErrorMessage(activation.error, t("errors.generic")) : null;

  let body;
  if (result) {
    body = (
      <div className="flex flex-col items-center gap-3 text-center">
        <CircleCheck className="size-12 text-success" />
        <p className="font-semibold">{rewardText(result)}</p>
        <Button
          variant="outline"
          onClick={() => {
            setResult(null);
            setCode("");
          }}
        >
          {t("promo.another")}
        </Button>
      </div>
    );
  } else if (picking) {
    body = (
      <>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("promo.pickTitle")}
        </h2>
        <div className="flex flex-col gap-3">
          {subscriptions.isError && <ErrorCard onRetry={() => void subscriptions.refetch()} />}
          {!targets && !subscriptions.isError && <Skeleton className="aspect-[2.6] w-full rounded-[20px]" />}
          {targets?.length === 0 && <Card className="text-sm text-muted-foreground">{t("promo.noSubs")}</Card>}
          {targets?.map((sub, i) => (
            <button
              key={sub.id}
              type="button"
              disabled={activation.isPending}
              className="text-left disabled:opacity-50"
              onClick={() => submit(sub.id)}
            >
              <SubscriptionCard sub={sub} index={i} compact />
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={() => {
            setPicking(false);
            activation.reset();
          }}
        >
          {t("common.cancel")}
        </Button>
      </>
    );
  } else {
    const onSubmit = (event: FormEvent) => {
      event.preventDefault();
      if (code.trim() && !activation.isPending) submit();
    };
    body = (
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <TextInput
          autoFocus
          value={code}
          placeholder={t("promo.placeholder")}
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            activation.reset();
          }}
        />
        {error && <p className="text-[12px] text-error">{error}</p>}
        <div className="mt-1 flex gap-2">
          <Button variant="outline" className="flex-1" type="button" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="accent" className="flex-1" disabled={!code.trim() || activation.isPending}>
            {t("promo.activate")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <BottomSheet variant="dialog" narrow icon={Percent} open={open} onClose={close} title={t("promo.title")}>
      {body}
    </BottomSheet>
  );
}

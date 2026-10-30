import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Percent, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { activatePromocode, usePromocodeTargetsQuery, type PromocodeActivation } from "@entities/plan/api";
import { useSubscriptionsQuery } from "@entities/subscription/api";
import { ApiError, getErrorMessage } from "@shared/api/http";
import { haptic } from "@shared/telegram";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { ButtonLink } from "@shared/ui/ButtonLink";
import { TextInput } from "@shared/ui/TextInput";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { RippleButton } from "@shared/ui/RippleButton";
import { Skeleton } from "@shared/ui/Skeleton";
import { SuccessMessage } from "@shared/ui/SuccessCheck";
import { FormError } from "@shared/ui/FormError";
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

  // the backend says which ones the reward can go to; the cards come from the subscriptions list
  const targetIds = usePromocodeTargetsQuery(code.trim(), picking);
  const targets =
    subscriptions.data && targetIds.data
      ? subscriptions.data.items.filter((s) => targetIds.data.subscription_ids.includes(s.id))
      : undefined;
  const listError =
    subscriptions.isError && !subscriptions.data
      ? subscriptions.error
      : targetIds.isError && !targetIds.data
        ? targetIds.error
        : null;
  const cancelPick = () => {
    setPicking(false);
    activation.reset();
  };
  const error = activation.error && !picking ? getErrorMessage(activation.error, t("errors.generic")) : null;

  let body;
  if (result) {
    body = (
      <>
        <SuccessMessage hint={rewardText(result)}>{t("promo.success")}</SuccessMessage>
        <Button variant="outline" size="lg" className="mt-6 w-full" onClick={close}>
          {t("common.continue")}
        </Button>
      </>
    );
  } else if (picking && targets?.length === 0) {
    // nothing the reward can go to: no question to answer, the way to a subscription instead
    body = (
      <>
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <TriangleAlert className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("promo.noTargetTitle")}</p>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={cancelPick}>
            {t("common.cancel")}
          </Button>
          <ButtonLink to="/purchase" onClick={close} variant="accent" className="flex-1">
            {t("home.buy")}
          </ButtonLink>
        </div>
      </>
    );
  } else if (picking) {
    body = (
      <>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("promo.pickTitle")}
        </h3>
        <div className="flex flex-col gap-3">
          {listError && (
            <ErrorCard
              round
              error={listError}
              onRetry={() => void (subscriptions.isError && !subscriptions.data ? subscriptions.refetch() : targetIds.refetch())}
            />
          )}
          {!targets && !listError && <Skeleton round className="aspect-[2.6] w-full" />}
          {targets?.map((sub) => (
            <RippleButton
              bounce={0.05}
              key={sub.id}
              type="button"
              disabled={activation.isPending}
              className="relative rounded-home text-left disabled:opacity-50"
              onClick={() => submit(sub.id)}
            >
              <SubscriptionCard sub={sub} compact />
            </RippleButton>
          ))}
        </div>
        <Button variant="outline" className="mt-5 w-full" onClick={cancelPick}>
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
        {error && <FormError>{error}</FormError>}
        <div className="mt-2 flex gap-2">
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
    <BottomSheet narrow bare={result !== null} icon={Percent} open={open} onClose={close} title={t("promo.title")}>
      {body}
    </BottomSheet>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { withdrawPoints } from "@entities/referral/api";
import { ApiError, getErrorMessage } from "@shared/api/http";
import { haptic } from "@shared/telegram";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { TextInput } from "@shared/ui/TextInput";

interface Props {
  open: boolean;
  onClose: () => void;
  // whole points the user can withdraw
  maxPoints: number;
}

export function WithdrawSheet({ open, onClose, maxPoints }: Props) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [amount, setAmount] = useState("");
  const [sent, setSent] = useState(false);

  const value = Number(amount);
  const valid = amount !== "" && Number.isInteger(value) && value >= 1 && value <= maxPoints;

  const withdraw = useMutation({
    mutationFn: withdrawPoints,
    onSuccess: () => {
      setSent(true);
      void client.invalidateQueries({ queryKey: ["referral"] });
      void client.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const close = () => {
    onClose();
    setAmount("");
    setSent(false);
    withdraw.reset();
  };

  // the limiter can answer 429 without an error body (e.g. from the proxy)
  const error = withdraw.error
    ? withdraw.error instanceof ApiError && withdraw.error.status === 429
      ? t("apiErrors.RATE_LIMITED")
      : getErrorMessage(withdraw.error, t("errors.generic"))
    : null;

  return (
    <BottomSheet open={open} onClose={close} title={t("referral.withdrawTitle")}>
      {sent ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{t("referral.withdrawSent")}</p>
          <Button variant="outline" onClick={close}>
            {t("referral.done")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("referral.withdrawHint")}</p>
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("referral.amountLabel", { max: maxPoints })}
            <TextInput
              type="number"
              inputMode="numeric"
              min={1}
              max={maxPoints}
              step={1}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                withdraw.reset();
              }}
            />
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button
            variant="solid"
            disabled={!valid || withdraw.isPending}
            onClick={() => {
              haptic();
              withdraw.mutate(value);
            }}
          >
            {t("referral.send")}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

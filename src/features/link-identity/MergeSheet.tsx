import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GitMerge } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiError, getErrorMessage } from "@shared/api/http";
import { haptic } from "@shared/telegram";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { InfoRow } from "@shared/ui/InfoRow";
import { FormError } from "@shared/ui/FormError";

import { linkApi } from "./api";
import type { MergeOffer } from "./useLinkResult";

interface MergeSheetProps {
  offer: MergeOffer | null;
  onClose: () => void;
  onMerged: () => void;
  /** The token is gone for good: the page shows the message, the sheet closes. */
  onExpired: (message: string) => void;
}

export function MergeBody({ offer, onClose, onMerged, onExpired }: MergeSheetProps & { offer: MergeOffer }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // counted from when the sheet got the offer
  const [deadline] = useState(() => Date.now() + offer.expiresIn * 1000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, deadline - now);

  const merge = useMutation({
    mutationFn: () => linkApi.merge(offer.token),
    onSuccess: async () => {
      // the answer carries raw discounts: refetch instead of caching it
      await Promise.all(
        ["me", "identities", "subscriptions", "referral", "transactions"].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });
  // the page is told through mutate()'s callbacks: those don't fire once this body is gone,
  // so a late answer for a replaced offer (the body is keyed by token) can't close the newer one
  const start = () =>
    merge.mutate(undefined, {
      onSuccess: onMerged,
      onError: (err) => {
        if (err instanceof ApiError && err.code === "MERGE_TOKEN_INVALID") onExpired(getErrorMessage(err, t("errors.generic")));
      },
    });
  // any other 4xx is final too: the backend burns the token before it checks the accounts
  const failed = merge.error instanceof ApiError && merge.error.status >= 400 && merge.error.status < 500;

  const rows = [
    [t("link.mergeSubscriptions"), offer.other.subscriptions],
    [t("link.mergeTransactions"), offer.other.transactions],
    [t("link.mergeReferrals"), offer.other.referrals],
    [
      t("link.mergeIdentities"),
      offer.other.identities.map((i) => `${t(`profile.kinds.${i.kind}`)}${i.label ? ` ${i.label}` : ""}`).join(", "),
    ],
  ] as const;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("link.mergeText")}</p>
      <Card variant="list">
        {rows.map(([label, value]) => (
          <InfoRow key={label} label={label} value={<span className="truncate">{value}</span>} />
        ))}
      </Card>
      <p className="text-[12px] text-muted-foreground">{t("link.mergeRules")}</p>
      {merge.isError && <FormError>{getErrorMessage(merge.error, t("errors.generic"))}</FormError>}
      <div className="mt-2 flex gap-2">
        {/* the one Cancel locked in flight: closing drops this body, and with it the answer to a merge for good */}
        <Button variant="outline" className="flex-1" disabled={merge.isPending} onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="accent"
          className="flex-1"
          disabled={left === 0 || merge.isPending || failed}
          onClick={() => {
            haptic();
            start();
          }}
        >
          {t("link.merge")}
        </Button>
      </div>
      <p className="text-center text-[12px] text-muted-foreground">
        {left === 0 ? t("link.mergeExpired") : t("link.mergeCountdown", { count: Math.ceil(left / 60_000) })}
      </p>
    </div>
  );
}

export function MergeSheet(props: MergeSheetProps) {
  const { t } = useTranslation();
  // keep the last offer on screen while the sheet slides out
  const [shown, setShown] = useState(props.offer);
  if (props.offer && props.offer !== shown) setShown(props.offer);
  return (
    <BottomSheet narrow icon={GitMerge} open={props.offer !== null} onClose={props.onClose} title={t("link.mergeTitle")}>
      {shown && <MergeBody key={shown.token} {...props} offer={shown} />}
    </BottomSheet>
  );
}

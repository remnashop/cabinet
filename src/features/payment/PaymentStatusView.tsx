import { Clock, CreditCard, Unplug } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { retryPath } from "@features/purchase/wizard";
import { getErrorMessage } from "@shared/api/http";
import { haptic } from "@shared/telegram";
import { AlertMark } from "@shared/ui/AlertMark";
import { Button } from "@shared/ui/Button";
import { SuccessCheck } from "@shared/ui/SuccessCheck";

import type { usePaymentStatus } from "./usePaymentStatus";

// the glow behind the mark and the rings a wait sends out
const TONE = {
  primary: ["bg-primary/30", "border-primary/40"],
  success: ["bg-success/30", "border-success/40"],
  error: ["bg-error/25", "border-error/40"],
  muted: ["bg-white/10", "border-white/20"],
} as const;

// a wait's and a timeout's disc, around their icon; success and error wear the shared marks
const DISC = {
  primary: "border-primary/40 bg-primary/12 text-primary",
  muted: "border-white/[0.14] bg-white/[0.06] text-muted-foreground",
} as const;

function StatusArt({
  tone,
  waiting = false,
  children,
}: {
  tone: keyof typeof TONE;
  waiting?: boolean;
  /** the disc's icon, for primary and muted */
  children?: ReactNode;
}) {
  const [glow, ring] = TONE[tone];
  // waiting: room for the rings it sends out (scale 2.3), so they don't run over the title
  return (
    <div className={`relative flex size-20 items-center justify-center ${waiting ? "my-10" : "mb-2"}`}>
      <span className={`absolute inset-0 rounded-full blur-2xl motion-safe:animate-breathe ${glow}`} />
      {waiting && (
        <>
          <span className={`absolute inset-0 rounded-full border motion-safe:animate-ripple-out ${ring}`} />
          <span
            className={`absolute inset-0 rounded-full border motion-safe:animate-ripple-out [animation-delay:1.2s] ${ring}`}
          />
          <span className="absolute -inset-1.5 rounded-full border-2 border-transparent border-t-primary motion-safe:animate-spin" />
        </>
      )}
      {/* relative: over the glow */}
      <span className="relative flex">
        {tone === "success" ? (
          <SuccessCheck />
        ) : tone === "error" ? (
          <AlertMark tone="error" />
        ) : (
          <span className={`flex size-16 items-center justify-center rounded-full border ${DISC[tone]}`}>{children}</span>
        )}
      </span>
    </div>
  );
}

export function PaymentStatusView({ status, transaction, error, retry }: ReturnType<typeof usePaymentStatus>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const home = (
    <Button variant="glass" size="lg" className="w-full" onClick={() => void navigate("/", { replace: true })}>
      {t("common.backHome")}
    </Button>
  );
  const heading = (title: string, text: string) => (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );

  if (status === "loading" || status === "pending") {
    return (
      <>
        <StatusArt tone="primary" waiting>
          <CreditCard className="size-7" />
        </StatusArt>
        {heading(t("payment.waitingTitle"), t("payment.waiting"))}
      </>
    );
  }
  if (status === "paid") {
    return (
      <>
        <StatusArt tone="success" />
        {heading(
          t("payment.paidTitle"),
          t(`payment.paid.${transaction?.purchase_type ?? "NEW"}`, { plan: transaction?.plan_name ?? "" }),
        )}
        <Button
          variant="glassSolid"
          size="lg"
          className="w-full"
          onClick={() => {
            haptic();
            void navigate("/", { replace: true });
          }}
        >
          <Unplug className="size-5" />
          {t("payment.connect")}
        </Button>
      </>
    );
  }
  if (status === "failed") {
    const canceled = transaction?.status === "CANCELED";
    return (
      <>
        <StatusArt tone="error" />
        {heading(
          t(canceled ? "payment.canceledTitle" : "payment.failed"),
          t(canceled ? "payment.canceledText" : "payment.failedText"),
        )}
        <div className="flex w-full flex-col gap-2">
          <Button variant="glassSolid" size="lg" className="w-full" onClick={() => void navigate(transaction ? retryPath(transaction) : "/purchase", { replace: true })}>
            {t("payment.retry")}
          </Button>
          {home}
        </div>
      </>
    );
  }
  if (status === "error") {
    return (
      <>
        <StatusArt tone="error" />
        {heading(t("payment.errorTitle"), getErrorMessage(error, t("errors.generic")))}
        {home}
      </>
    );
  }
  return (
    <>
      <StatusArt tone="muted">
        <Clock className="size-7" />
      </StatusArt>
      {heading(t("payment.timeoutTitle"), t("payment.timeout"))}
      <div className="flex w-full flex-col gap-2">
        <Button variant="glassSolid" size="lg" className="w-full" onClick={retry}>
          {t("payment.checkAgain")}
        </Button>
        {home}
      </div>
    </>
  );
}

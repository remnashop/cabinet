import { Clock, CreditCard, Unplug } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { retryPath } from "@features/purchase/wizard";
import { getErrorMessage } from "@shared/api/http";
import { haptic } from "@shared/telegram";
import { Button } from "@shared/ui/Button";
import { Sparks } from "@shared/ui/SuccessCheck";

import type { usePaymentStatus } from "./usePaymentStatus";

const TONE = {
  primary: ["border-primary/40 bg-primary/12 text-primary", "bg-primary/30", "border-primary/40"],
  success: ["border-success/40 bg-success/15 text-success", "bg-success/30", "border-success/40"],
  error: ["border-error/40 bg-error/15 text-error", "bg-error/25", "border-error/40"],
  muted: ["border-white/[0.14] bg-white/[0.06] text-muted-foreground", "bg-white/10", "border-white/20"],
} as const;

function StatusArt({
  tone,
  waiting = false,
  path,
  children,
}: {
  tone: keyof typeof TONE;
  waiting?: boolean;
  path?: string;
  children?: ReactNode;
}) {
  const [disc, glow, ring] = TONE[tone];
  // waiting: room for the rings it sends out (scale 2.3), so they don't run over the title
  return (
    <div className={`relative flex size-20 items-center justify-center ${waiting ? "my-10" : "mb-2"}`} aria-hidden>
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
      {tone === "success" && <Sparks />}
      <span className={`relative flex size-16 items-center justify-center rounded-full border ${disc} ${path ? (tone === "error" ? "motion-safe:animate-pop-shake" : "motion-safe:animate-pop") : ""}`}>
        {path ? (
          <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.25}>
            {/* pathLength 1: the dash animation draws it whatever the path's real length */}
            <path
              d={path}
              pathLength={1}
              strokeDasharray={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="motion-safe:animate-draw"
            />
          </svg>
        ) : (
          children
        )}
      </span>
    </div>
  );
}

const CHECK = "M20 6 9 17l-5-5";
const CROSS = "M18 6 6 18M6 6l12 12";

export function PaymentStatusView({ status, transaction, error, retry }: ReturnType<typeof usePaymentStatus>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const home = (
    <Button variant="outline" size="lg" className="w-full" onClick={() => void navigate("/", { replace: true })}>
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
        <StatusArt tone="success" path={CHECK} />
        {heading(
          t("payment.paidTitle"),
          t(`payment.paid.${transaction?.purchase_type ?? "NEW"}`, { plan: transaction?.plan_name ?? "" }),
        )}
        <Button
          variant="solid"
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
        <StatusArt tone="error" path={CROSS} />
        {heading(
          t(canceled ? "payment.canceledTitle" : "payment.failed"),
          t(canceled ? "payment.canceledText" : "payment.failedText"),
        )}
        <div className="flex w-full flex-col gap-2">
          <Button variant="solid" size="lg" className="w-full" onClick={() => void navigate(transaction ? retryPath(transaction) : "/purchase", { replace: true })}>
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
        <StatusArt tone="error" path={CROSS} />
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
        <Button variant="solid" size="lg" className="w-full" onClick={retry}>
          {t("payment.checkAgain")}
        </Button>
        {home}
      </div>
    </>
  );
}

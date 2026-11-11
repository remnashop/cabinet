import { Check, Gift, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useQuoteQuery, type PaymentMethod, type Plan, type PlanAccess, type Quote } from "@entities/plan/api";
import { durationLabel } from "@features/purchase/wizard";
import { formatMoney } from "@shared/lib/format";
import { PILL_SPRING } from "@shared/lib/motion";
import { RippleButton } from "@shared/ui/RippleButton";

import { PlanLimits } from "./PlanLimits";

interface HeadProps {
  plan: Plan;
  step: 0 | 1 | 2;
  days: number | null;
  method: PaymentMethod | null;
  currency: string;
  access: PlanAccess;
  /** the only payment method is taken without asking: its step isn't one */
  skipMethod: boolean;
  onStep: (step: 0 | 1) => void;
}

const STEPS = ["purchase.stepDuration", "purchase.stepMethod", "purchase.stepSummary"] as const;

export function WizardHead(props: HeadProps) {
  const { plan, step, days, method, currency, access } = props;
  const { t, i18n } = useTranslation();
  // the quote's total, as the method step shows it: a list price here would argue with the rows under it
  const quote = useQuoteQuery(
    days === null ? null : { plan_id: plan.id, duration_days: days, currency: method?.currency ?? currency, ...access },
  );
  const price = quote.data && { price: quote.data.final_price, currency: quote.data.currency };
  return (
    <div className="mb-5 flex flex-col gap-5">
      <DotStepper {...props} />
      <div className="relative overflow-hidden rounded-home glass-panel p-5 text-foreground lg:p-4">
        <div className="relative flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              {plan.is_trial ? <Gift className="size-4 shrink-0" /> : <Zap className="size-4 shrink-0" />}
              <span className="truncate text-base font-bold">{plan.name}</span>
            </span>
            <PlanLimits plan={plan} />
          </div>
          {days !== null && step > 0 && (
            <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
              <span className="rounded-full bg-white/[0.12] px-2.5 py-1 text-xs font-semibold">{durationLabel(days, t)}</span>
              {step === 1 && price && (
                <span className="text-xl font-bold tabular-nums tracking-tight">
                  {formatMoney(price.price, price.currency, i18n.language)}
                </span>
              )}
            </div>
          )}
        </div>
        {step === 2 && quote.data && <Receipt quote={quote.data} />}
      </div>
    </div>
  );
}

function Receipt({ quote }: { quote: Quote }) {
  const { t, i18n } = useTranslation();
  const money = (amount: number | string) => formatMoney(amount, quote.currency, i18n.language);
  const base = Number(quote.base_price);
  const final = Number(quote.final_price);
  // as the backend counts: the promotion off the list price, the user's discount off what's left, the total rounded
  // once; the user's line takes the remainder, so the lines always add up to the total
  const promo = (base * quote.plan_discount_percent) / 100;
  const lines: [label: string, amount: string, off: boolean][] = [[t("purchase.receiptPrice"), money(base), false]];
  if (quote.plan_discount_percent > 0) {
    lines.push([t("purchase.receiptPromo", { percent: quote.plan_discount_percent }), `−${money(promo)}`, true]);
  }
  if (quote.discount_percent > 0) {
    lines.push([t("purchase.receiptDiscount", { percent: quote.discount_percent }), `−${money(base - promo - final)}`, true]);
  }
  return (
    <div className="relative mt-4 flex flex-col gap-2.5 border-t border-dashed border-white/15 pt-4 text-sm">
      <div className="flex flex-col gap-1">
        {lines.map(([label, amount, off]) => (
          <div key={label} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className={`font-semibold tabular-nums ${off ? "text-success" : ""}`}>{amount}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-dashed border-white/15 pt-3.5">
        <span className="text-xs font-semibold uppercase tracking-wide">{t("purchase.total")}</span>
        <span className="flex items-baseline gap-2">
          {final < base && <span className="text-xs text-muted-foreground tabular-nums line-through">{money(base)}</span>}
          <span className="text-2xl font-bold leading-tight tabular-nums tracking-tight">{money(final)}</span>
        </span>
      </div>
      {final < base && (
        <span className="-mt-1.5 self-end text-xs text-success">{t("purchase.savings", { amount: money(base - final) })}</span>
      )}
    </div>
  );
}

/** The steps in one capsule across the whole width, as the bottom nav's but in the duration tiles' fill: the current one in a highlight that glides
 *  between them; a done one adds a tick and leads back to it; the ones ahead have their names muted. When the names
 *  don't fit (a phone, the ticks of the last step), only the current one keeps its name: the others shrink to
 *  "Step 2", with the tick once done. */
function DotStepper({ step, skipMethod, onStep }: HeadProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  // the step the names were found cut on: another step (fewer ticks) or a resize tries them again; the check below,
  // before paint, falls back if one is cut
  const [compactAt, setCompactAt] = useState<number | null>(null);
  const compact = compactAt === step;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setCompactAt(null));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (compact || !ref.current) return;
    if ([...ref.current.querySelectorAll(".truncate")].some((el) => el.scrollWidth > el.clientWidth)) setCompactAt(step);
  }, [compact, step, t]);
  const steps = STEPS.map((key, i) => ({ key, i })).filter(({ i }) => !(i === 1 && skipMethod));
  return (
    // the panel's TabBar: a 48px glass capsule with 36px tabs 6px in
    <div
      ref={ref}
      className="glass-panel flex h-12 w-full gap-1 rounded-full p-1.5"
    >
      {steps.map(({ key, i }, position) => {
        const done = i < step;
        const current = i === step;
        const named = !compact || current;
        return (
          <RippleButton
            key={key}
            type="button"
            disabled={!done}
            aria-label={t(key)}
            aria-current={current ? "step" : undefined}
            onClick={() => onStep(i as 0 | 1)}
            className={`relative isolate flex h-9 min-w-0 ${named ? "flex-auto" : "flex-none"} items-center justify-center rounded-full transition-colors ${
              current ? "text-primary" : done ? "text-foreground hover:bg-white/[0.06]" : "text-muted-foreground"
            }`}
          >
            {current && (
              <motion.span
                layoutId="wizard-step-pill"
                className="absolute inset-0 -z-10 rounded-full bg-accent"
                transition={PILL_SPRING}
              />
            )}
            <span aria-hidden className="flex min-w-0 items-center gap-1 px-2 text-sm font-medium lg:gap-1.5 lg:px-4">
              {done && <Check className="size-3.5 shrink-0" strokeWidth={3} />}
              <span className="truncate">{named ? t(key) : t("purchase.stepNumber", { number: position + 1 })}</span>
            </span>
          </RippleButton>
        );
      })}
    </div>
  );
}

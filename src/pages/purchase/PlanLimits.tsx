import { Gauge, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Plan } from "@entities/plan/api";
import { planLimits } from "@features/purchase/wizard";

/** className: layout only (grid placement, a row on wide screens). */
export function PlanLimits({ plan, className = "" }: { plan: Plan; className?: string }) {
  const { t, i18n } = useTranslation();
  const [traffic, devices] = planLimits(plan, t, i18n.language);
  return (
    <ul className={`flex flex-col gap-1.5 text-sm ${className}`}>
      {[
        { icon: Gauge, text: traffic },
        { icon: Smartphone, text: devices },
      ].map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-white/20">
            <Icon className="size-3" />
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
}

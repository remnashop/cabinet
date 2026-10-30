import { Percent, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const TONE = {
  success: ["border-success/20 bg-success/10", "text-success"],
  primary: ["border-primary/20 bg-primary/10", "text-primary"],
} as const;

/** A note in a tinted pill: a discount (the user's own, the plan's promotion), what an action will do. */
export function NotePill({
  icon: Icon = Percent,
  tone = "success",
  children,
}: {
  icon?: LucideIcon;
  tone?: keyof typeof TONE;
  children: ReactNode;
}) {
  const [frame, ink] = TONE[tone];
  return (
    <p className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-[12.5px] text-foreground ${frame}`}>
      <Icon className={`size-4 shrink-0 ${ink}`} />
      {children}
    </p>
  );
}

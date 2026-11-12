// The panel's Button variants (14px). glass: a secondary action, a card header's, a dialog footer's cancel;
// glassAccent: a dialog or form footer's action; glassSolid: the one main action of a screen; glassDanger: a
// destructive one; secondary: a button beside a field (semibold).
export type ButtonVariant = "glass" | "glassAccent" | "glassSolid" | "glassDanger" | "secondary";

const COLOR_CLASS: Record<ButtonVariant, string> = {
  glass: "border-glass-border bg-white/[0.03] text-foreground/90 hover:bg-white/[0.06]",
  glassAccent: "border-primary/35 bg-primary/15 text-primary hover:bg-primary/20",
  glassSolid:
    "border-transparent bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] hover:bg-primary-hover",
  glassDanger: "border-glass-border bg-white/[0.03] text-error hover:bg-error/10",
  secondary: "border-border text-foreground/90 hover:bg-white/[0.06]",
};

const TYPE_CLASS: Record<ButtonVariant, string> = {
  glass: "gap-1.5 px-3.5 text-sm font-medium",
  glassAccent: "gap-1.5 px-3.5 text-sm font-medium",
  glassSolid: "gap-1.5 px-3.5 text-sm font-semibold",
  glassDanger: "gap-1.5 px-3.5 text-sm font-medium",
  secondary: "gap-1.5 px-3.5 text-sm font-semibold",
};

// sm: 32px, a list row's action; the glass ones keep their own type at every height, as the panel's
const SM_TYPE_CLASS = "gap-1.5 px-3 text-sm font-medium";

const LG_TYPE_CLASS = "gap-2 px-6 text-base font-semibold";

// field: 38px, lines up with a text input in the same row; lg: 64px, a hero screen's main actions, as tall as the
// bottom nav's capsule under them
const SIZE_CLASS = { sm: "h-8", md: "h-9", field: "h-9.5", lg: "h-16" } as const;
export type ButtonSize = keyof typeof SIZE_CLASS;

/** A button's look for an element that has to be something else: an `<a>` whose href the OS must follow. */
export function buttonClass(variant: ButtonVariant, size: ButtonSize = "md"): string {
  const typography =
    size === "sm" && !variant.startsWith("glass")
      ? SM_TYPE_CLASS
      : size === "lg"
        ? LG_TYPE_CLASS
        : TYPE_CLASS[variant];
  // relative: the tap's Ripple lays itself over the button
  return `relative flex shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${SIZE_CLASS[size]} ${COLOR_CLASS[variant]} ${typography}`;
}

// accent/solid/outline/danger: primary and destructive actions, dialog and form footers (14px).
// secondary: buttons next to a field (14px semibold).
// glass: a card header's action, 36px like the panel Section's aside, and a dialog footer's cancel; glassAccent and
// glassDanger: a dialog footer's action (14px medium, the panel's ConfirmDialog).
export type ButtonVariant = "accent" | "solid" | "outline" | "secondary" | "danger" | "glass" | "glassAccent" | "glassDanger";

const COLOR_CLASS: Record<ButtonVariant, string> = {
  // the panel's glassAccent and glassSolid
  accent: "border-primary/35 bg-primary/15 text-primary hover:bg-primary/20",
  solid: "border-transparent bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] hover:bg-primary-hover",
  outline: "border-border bg-white/[0.03] text-foreground/80 hover:bg-white/[0.06]",
  secondary: "border-border text-foreground/90 hover:bg-white/[0.06]",
  danger: "border-border text-error hover:bg-error/10",
  glass: "border-glass-border bg-white/[0.03] text-foreground/90 hover:bg-white/[0.06]",
  glassAccent: "border-primary/35 bg-primary/15 text-primary hover:bg-primary/20",
  glassDanger: "border-glass-border bg-white/[0.03] text-error hover:bg-error/10",
};

const TYPE_CLASS: Record<ButtonVariant, string> = {
  accent: "gap-1.5 px-4 text-sm font-medium",
  solid: "gap-1.5 px-4 text-sm font-semibold",
  outline: "gap-1.5 px-4 text-sm font-medium",
  secondary: "gap-1.5 px-3.5 text-sm font-semibold",
  danger: "gap-1.5 px-4 text-sm font-medium",
  glass: "gap-1.5 px-3.5 text-sm font-medium",
  glassAccent: "gap-1.5 px-3.5 text-sm font-medium",
  glassDanger: "gap-1.5 px-3.5 text-sm font-medium",
};

const SM_TYPE_CLASS = "gap-1.5 px-3 text-sm";

const LG_TYPE_CLASS = "gap-2 px-6 text-base font-semibold";

// field: 38px, lines up with a text input in the same row; lg: 64px, a hero screen's main actions, as tall as the
// bottom nav's capsule under them
const SIZE_CLASS = { sm: "h-8", md: "h-9", field: "h-9.5", lg: "h-16" } as const;
export type ButtonSize = keyof typeof SIZE_CLASS;

/** A 36px glass circle around a 16px icon (a section's mark, the header's page icon); the text color is the caller's. */
export const ICON_CIRCLE_CLASS =
  "flex size-9 shrink-0 items-center justify-center rounded-full border border-glass-border bg-white/[0.05]";

/** The circle as a button (copy, sign out). */
export const ICON_BUTTON_CLASS = `${ICON_CIRCLE_CLASS} transition-colors hover:bg-white/[0.08]`;

/** A button's look for an element that has to be something else: an `<a>` whose href the OS must follow. */
export function buttonClass(variant: ButtonVariant, size: ButtonSize = "md"): string {
  const typography =
    size === "sm"
      ? `${SM_TYPE_CLASS} ${variant === "danger" ? "font-semibold" : "font-medium"}`
      : size === "lg"
        ? LG_TYPE_CLASS
        : TYPE_CLASS[variant];
  // relative: the tap's ripple (use-ripple) lays itself over the button
  return `relative flex shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${SIZE_CLASS[size]} ${COLOR_CLASS[variant]} ${typography}`;
}

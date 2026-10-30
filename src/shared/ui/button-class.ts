// accent/solid/outline/danger: primary and destructive actions, dialog and form footers (14px).
// secondary: card-header actions and buttons next to a field (12.5px semibold).
export type ButtonVariant = "accent" | "solid" | "outline" | "secondary" | "danger";

const COLOR_CLASS: Record<ButtonVariant, string> = {
  accent: "border-transparent bg-accent text-primary hover:bg-primary/20",
  solid: "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover",
  outline: "border-border bg-white/[0.03] text-foreground/80 hover:bg-white/[0.06]",
  secondary: "border-border text-foreground/90 hover:bg-white/[0.06]",
  danger: "border-border text-error hover:bg-error/10",
};

const TYPE_CLASS: Record<ButtonVariant, string> = {
  accent: "gap-1.5 px-4 text-sm font-medium",
  solid: "gap-1.5 px-4 text-sm font-semibold",
  outline: "gap-1.5 px-4 text-sm font-medium",
  secondary: "gap-1.5 px-3.5 text-[12.5px] font-semibold",
  danger: "gap-1.5 px-4 text-sm font-medium",
};

const SM_TYPE_CLASS = "gap-1.5 px-3 text-[12.5px]";

const LG_TYPE_CLASS = "gap-2 px-6 text-base font-semibold";

// field: 38px, lines up with a text input in the same row; lg: 64px, a hero screen's main actions, as tall as the
// bottom nav's capsule under them
const SIZE_CLASS = { sm: "h-8", md: "h-9", field: "h-9.5", lg: "h-16" } as const;
export type ButtonSize = keyof typeof SIZE_CLASS;

/** A 36px glass circle around a 17px icon (the header's bell, copy); the text color is the caller's. */
export const ICON_BUTTON_CLASS =
  "flex size-9 shrink-0 items-center justify-center rounded-full border border-glass-border bg-white/[0.05] transition-colors hover:bg-white/[0.06]";

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

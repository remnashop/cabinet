import type { ComponentProps } from "react";

// the panel's glass/Input: a sunken well, the ring on it for focus and an invalid value
const TEXT_FIELD_CLASS =
  "glass-well ring-inset transition-shadow text-sm font-normal text-foreground outline-none px-3.5 py-2 placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-primary aria-invalid:ring-1 aria-invalid:ring-error data-invalid-native:ring-1 data-invalid-native:ring-error disabled:cursor-not-allowed disabled:opacity-40";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`rounded-full ${TEXT_FIELD_CLASS} ${className}`} {...props} />;
}

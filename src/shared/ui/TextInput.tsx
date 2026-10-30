import type { ComponentProps } from "react";

const TEXT_FIELD_CLASS =
  "border border-border bg-input/60 transition-colors text-sm font-normal text-foreground outline-none px-3 py-2 focus:border-primary aria-invalid:border-error aria-invalid:focus:border-error data-invalid-native:border-error data-invalid-native:focus:border-error disabled:cursor-not-allowed disabled:opacity-50";

export function TextInput({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`rounded-full ${TEXT_FIELD_CLASS} ${className}`} {...props} />;
}

import type { ComponentProps } from "react";

import { HEADER_CIRCLE_CLASS } from "./IconCircle";
import { Ripple } from "./Ripple";

const TONE = {
  default: "text-foreground",
  success: "text-success",
  danger: "text-error hover:bg-error/10",
} as const;

/** The panel's IconButton tone="glass": a 36px glass circle around a 16px icon (copy, sign out). */
export function IconButton({
  tone = "default",
  type = "button",
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { tone?: keyof typeof TONE }) {
  return (
    <button
      type={type}
      className={`relative ${HEADER_CIRCLE_CLASS} transition-colors hover:bg-white/[0.08] ${TONE[tone]} ${className}`}
      {...props}
    >
      {children}
      <Ripple />
    </button>
  );
}

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

import { useRipple } from "./use-ripple";

/**
 * A bare button that answers a tap with a ripple, for one that isn't a Button: a chip, a card, an icon. The ripple goes over the content, so a positioned child (a card)
 * doesn't hide it; className should carry `relative` and the button's own rounding.
 */
export function RippleButton({
  type = "button",
  onPointerDown,
  children,
  ...props
}: HTMLMotionProps<"button"> & { children: ReactNode }) {
  const ripple = useRipple();
  return (
    <motion.button
      type={type}
      onPointerDown={(event) => {
        ripple.onPointerDown(event);
        onPointerDown?.(event);
      }}
      {...props}
    >
      {children}
      {ripple.ripples}
    </motion.button>
  );
}

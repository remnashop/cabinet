import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

import { bounceTap } from "@shared/lib/bounceState";

import { useRipple } from "./use-ripple";

/**
 * A bare button that answers a tap with a ripple, for one that isn't a Button: a chip, a card, an icon. bounce: also
 * the tap's bounce, at that multiplier (bounceTap). The ripple goes over the content, so a positioned child (a card)
 * doesn't hide it; className should carry `relative` and the button's own rounding.
 */
export function RippleButton({
  bounce,
  type = "button",
  onPointerDown,
  children,
  ...props
}: HTMLMotionProps<"button"> & { bounce?: number; children: ReactNode }) {
  const ripple = useRipple();
  return (
    <motion.button
      type={type}
      {...(bounce ? bounceTap(bounce) : {})}
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

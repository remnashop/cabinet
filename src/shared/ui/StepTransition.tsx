import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { FADE_IN, FADE_OUT } from "@shared/lib/motion";

/**
 * A step inside a page (a wizard's, the login's email → code) cross-fades as the pages themselves do (AppShell's
 * AnimatedOutlet): the old one out, then the new one in. A new stepKey is a new step; the first one shows as is.
 */
export function StepTransition({
  stepKey,
  className,
  children,
}: {
  stepKey: string | number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: FADE_IN }}
        exit={{ opacity: 0, transition: FADE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

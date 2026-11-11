import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";


import { buttonClass, type ButtonSize, type ButtonVariant } from "./button-class";
import { useRipple } from "./use-ripple";

export type { ButtonVariant } from "./button-class";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function Button({
  variant,
  size = "md",
  className = "",
  type = "button",
  onPointerDown,
  children,
  ...props
}: ButtonProps) {
  const ripple = useRipple();
  return (
    <motion.button
      type={type}
      className={`${buttonClass(variant, size)} ${className}`}
      onPointerDown={(event) => {
        ripple.onPointerDown(event);
        onPointerDown?.(event);
      }}
      {...props}
    >
      {ripple.ripples}
      {children as ReactNode}
    </motion.button>
  );
}

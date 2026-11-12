import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";


import { buttonClass, type ButtonSize, type ButtonVariant } from "./button-class";
import { Ripple } from "./Ripple";

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
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      className={`${buttonClass(variant, size)} ${className}`}
      {...props}
    >
      <Ripple />
      {children as ReactNode}
    </motion.button>
  );
}

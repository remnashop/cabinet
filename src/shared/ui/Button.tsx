import { motion, type HTMLMotionProps } from "motion/react";

import { bounceTap } from "@shared/lib/bounceState";

import { buttonClass, type ButtonSize, type ButtonVariant } from "./button-class";

export type { ButtonVariant } from "./button-class";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant: ButtonVariant;
  size?: ButtonSize;
  /** layout only (flex-1, w-full, mt-2...), no classes that fight the variant's */
  className?: string;
}

export function Button({ variant, size = "md", className = "", type = "button", ...props }: ButtonProps) {
  return <motion.button type={type} {...bounceTap()} className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Link } from "react-router";


import { buttonClass, type ButtonSize, type ButtonVariant } from "./button-class";
import { Ripple } from "./Ripple";

const MotionLink = motion.create(Link);

/**
 * A link that looks and answers a tap as Button does (ripple). to: a route in the cabinet; href: an anchor,
 * which an app scheme or another site needs.
 */
export function ButtonLink({
  variant,
  size = "md",
  className = "",
  to,
  replace,
  href,
  target,
  rel,
  onClick,
  children,
}: {
  variant: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  to?: string;
  replace?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const props = {
    onClick,
    className: `${buttonClass(variant, size)} ${className}`,
  };
  const content = (
    <>
      <Ripple />
      {children}
    </>
  );
  return to !== undefined ? (
    <MotionLink to={to} replace={replace} {...props}>
      {content}
    </MotionLink>
  ) : (
    <motion.a href={href} target={target} rel={rel} {...props}>
      {content}
    </motion.a>
  );
}

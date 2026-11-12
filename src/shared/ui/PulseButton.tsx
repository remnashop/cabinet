import type { ReactNode } from "react";
import { Link } from "react-router";

import { haptic } from "@shared/telegram";

import { Button } from "./Button";
import { buttonClass } from "./button-class";
import { Ripple } from "./Ripple";

/**
 * The one action to take: a solid lg button whose glow flares and fades (animate-glow-pulse, on a wrapper: the
 * primitive's className is layout only). href: an anchor, which an app scheme needs; to: a route in the cabinet.
 */
export function PulseButton({
  onClick,
  href,
  to,
  className = "",
  children,
}: {
  onClick?: () => void;
  href?: string;
  to?: string;
  className?: string;
  children: ReactNode;
}) {
  const linkProps = { onClick: () => haptic(), className: buttonClass("glassSolid", "lg") };
  return (
    <div className={`flex flex-col rounded-full motion-safe:animate-glow-pulse ${className}`}>
      {to ? (
        <Link to={to} {...linkProps}>
          <Ripple />
          {children}
        </Link>
      ) : href ? (
        <a href={href} {...linkProps}>
          <Ripple />
          {children}
        </a>
      ) : (
        <Button variant="glassSolid" size="lg" onClick={onClick}>
          {children}
        </Button>
      )}
    </div>
  );
}

import type { ComponentType, HTMLAttributes, ReactNode } from "react";

import { useSurface } from "./surface";

const PADDING = {
  page: "p-4",
  form: "flex flex-col gap-3 px-3.5 pb-3.5",
  list: "p-1.5",
  bare: "",
} as const;

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** page: a page/settings card; form: a titled form section; list: InfoRow rows; bare: a container, no padding */
  variant?: keyof typeof PADDING;
  title?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** renders the title as a <label> for this input id */
  titleFor?: string;
  round?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ variant = "page", title, icon: Icon, titleFor, round, className = "", children, ...props }: CardProps) {
  // the title's own pt-2 plus pt-1.5 lines its text up where pt-3.5 would put untitled content
  const top = variant === "form" ? (title ? "pt-1.5" : "pt-3.5") : "";
  const Title = titleFor ? "label" : "h3";
  const { shape, fill } = useSurface(round);
  // a 32px phone block is 20px in; a dialog's plate ignores round and keeps 16px
  const padding = variant === "page" && shape === "rounded-home" ? "p-5 lg:p-4" : PADDING[variant];
  return (
    <div className={`${shape} ${fill} ${padding} ${top} ${className}`} {...props}>
      {title && (
        <Title
          htmlFor={titleFor}
          className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground ${
            variant === "list" ? "px-2.5 pb-1 pt-2" : "pt-2"
          }`}
        >
          {Icon && <Icon className="size-3.5" />}
          {title}
        </Title>
      )}
      {children}
    </div>
  );
}

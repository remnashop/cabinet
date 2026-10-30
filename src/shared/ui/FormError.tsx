import type { ReactNode } from "react";

/** What went wrong under a form or an action: a field's check or the server's answer. className: layout only. */
export function FormError({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <p role="alert" className={`text-[12px] text-error ${className}`}>
      {children}
    </p>
  );
}

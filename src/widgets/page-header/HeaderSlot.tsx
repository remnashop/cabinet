import { useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { HeaderSlotContext } from "@widgets/page-header/header-slot";

/** A page's title row, drawn in the shell's header (as the panel's Header) or in place outside the shell. */
export function HeaderSlot({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlotContext);
  return slot ? createPortal(children, slot) : <header className="flex min-h-9 items-center gap-2">{children}</header>;
}

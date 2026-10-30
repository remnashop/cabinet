import { useState, type ReactNode } from "react";

import { useSupportLinks } from "@entities/shop/api";
import { openExternal } from "@shared/telegram";
import { SupportDialog } from "@widgets/support/SupportDialog";

/** Every "support" button's way in. available: the shop set somewhere to write (no button otherwise); open: the one
 *  way straight away, a choice in the dialog only when there are two; dialog: render it beside the button. */
export function useSupport(): { available: boolean; open: () => void; dialog: ReactNode } {
  const links = useSupportLinks();
  const [shown, setShown] = useState(false);
  const only = links.telegram && links.web ? null : (links.telegram ?? links.web);
  return {
    available: Boolean(links.telegram || links.web),
    open: () => (only ? openExternal(only) : setShown(true)),
    dialog: <SupportDialog open={shown} onClose={() => setShown(false)} />,
  };
}

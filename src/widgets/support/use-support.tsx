import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";

import { useCabinetSettingsQuery, useSupportLinks } from "@entities/shop/api";
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

/** A push click opens the app on `?support=1`: no gesture is left, so openExternal would be blocked. Show the dialog
 *  (when the shop has a contact) and strip the param. Render the result inside the router. */
export function useSupportFromLink(): ReactNode {
  const [params, setParams] = useSearchParams();
  const settings = useCabinetSettingsQuery();
  const { available } = useSupport();
  const [shown, setShown] = useState(false);
  const asked = params.get("support") === "1";
  // the contacts come with the settings: wait for them, or the ask would be dropped as "no support"
  const ready = asked && !settings.isPending;
  if (ready && available && !shown) setShown(true);
  useEffect(() => {
    if (!ready) return;
    const next = new URLSearchParams(params);
    next.delete("support");
    setParams(next, { replace: true });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps -- once per ask
  return <SupportDialog open={shown} onClose={() => setShown(false)} />;
}

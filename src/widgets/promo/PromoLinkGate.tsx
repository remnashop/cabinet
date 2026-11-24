import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { usePendingLegalQuery } from "@entities/legal/api";
import { activateAdLinkPromocode, activatePromocodeByLink } from "@entities/plan/api";
import { useMeQuery } from "@entities/session/api";
import { useAuthMethodsQuery } from "@features/auth/api";
import { ApiError } from "@shared/api/http";
import { takePromoLink } from "@shared/lib/promo-link";
import { type PromoLinkOpening, PromoDialog } from "@widgets/promo/PromoDialog";

/** Applies the promocode the cabinet was opened with, once the customer is signed in, and says how it went. */
export function PromoLinkGate() {
  const queryClient = useQueryClient();
  const [opening, setOpening] = useState<PromoLinkOpening | null>(null);
  // the documents and the required email hold the screen first, and the account the code lands on may still merge
  const pendingLegal = usePendingLegalQuery();
  const methods = useAuthMethodsQuery();
  const me = useMeQuery();
  const ready =
    !pendingLegal.isPending &&
    (pendingLegal.data?.items.length ?? 0) === 0 &&
    !methods.isPending &&
    !me.isPending &&
    !(methods.data?.email_required && me.data && !me.data.email);

  useEffect(() => {
    if (!ready) return;
    // taken here, not in a state initializer: StrictMode's second run then finds it gone instead of losing it
    const link = takePromoLink();
    if (!link) return;
    const apply = link.kind === "promo" ? activatePromocodeByLink : activateAdLinkPromocode;
    apply(link.code)
      .then((result) => {
        if (result.outcome === null) return;
        if (result.outcome === "ACTIVATED") {
          void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
          void queryClient.invalidateQueries({ queryKey: ["me"] });
        }
        setOpening({ result });
      })
      .catch((error: unknown) => {
        // a backend without these routes answers a bare 404: nothing to say then
        if (error instanceof ApiError && error.code === null) return;
        // an ad link opened again (a used code, one for newcomers only) isn't worth a dialog: nobody asked for it
        if (link.kind === "ad") return;
        setOpening({ error, code: link.code.toUpperCase() });
      });
  }, [ready, queryClient]);

  if (!opening) return null;
  return <PromoDialog open link={opening} onClose={() => setOpening(null)} />;
}

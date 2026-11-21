import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { activateAdLinkPromocode, activatePromocodeByLink } from "@entities/plan/api";
import { takePromoLink } from "@shared/lib/promo-link";
import { type PromoLinkOpening, PromoDialog } from "@widgets/promo/PromoDialog";

/** Applies the promocode the cabinet was opened with, once the customer is signed in, and says how it went. */
export function PromoLinkGate() {
  const queryClient = useQueryClient();
  const [opening, setOpening] = useState<PromoLinkOpening | null>(null);

  useEffect(() => {
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
      // an ad link's code stays out of the field: the customer never saw it
      .catch((error: unknown) => setOpening({ error, code: link.kind === "promo" ? link.code.toUpperCase() : undefined }));
  }, [queryClient]);

  if (!opening) return null;
  return <PromoDialog open link={opening} onClose={() => setOpening(null)} />;
}

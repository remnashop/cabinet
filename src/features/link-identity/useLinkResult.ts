import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import type { IdentityKind } from "@entities/identity/api";

import type { LinkResult, MergePreview } from "./api";

/** What the merge sheet needs: the backend's offer to fold the other account into this one. */
export interface MergeOffer {
  /** the method whose link found the other account */
  kind: IdentityKind;
  token: string;
  expiresIn: number; // seconds, from when the result arrived
  other: MergePreview;
}

/** A link's outcome and the method it was about: the notice is titled with it. */
export interface LinkNotice {
  status: "linked" | "already_linked" | "merged";
  kind: IdentityKind;
}

/**
 * One handler for every link flow (email in place, bot and OAuth via navigate("/profile", {state: {linkResult,
 * linkKind}})); the backend's answer doesn't name the method, so each flow passes its own.
 * Owned by the profile page: it shows the notice in a dialog (closeNotice) and hands `merge` to the merge sheet.
 */
/** onBroken: a merge asked for without its offer, stable (useCallback) as the effect below depends on it */
export function useLinkResult(onBroken: () => void) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<LinkNotice | null>(null);
  const [merge, setMerge] = useState<MergeOffer | null>(null);

  const handleLinkResult = useCallback(
    (result: LinkResult, kind: IdentityKind) => {
      // refetch, never cache from the answer
      void queryClient.invalidateQueries({ queryKey: ["identities"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      if (result.status === "merge_required") {
        if (result.merge_token && result.other) {
          setMerge({
            kind,
            token: result.merge_token,
            expiresIn: result.expires_in ?? 0,
            other: result.other,
          });
        } else {
          onBroken();
        }
        return;
      }
      setNotice({ status: result.status, kind });
    },
    [queryClient, onBroken],
  );

  // a result brought by navigation is handled once and dropped from history, so Back or a reload can't replay it
  const state = location.state as { linkResult?: LinkResult; linkKind?: IdentityKind } | null;
  const incoming = state?.linkResult;
  const incomingKind = state?.linkKind;
  const handled = useRef<LinkResult | null>(null);
  useEffect(() => {
    if (!incoming || !incomingKind || handled.current === incoming) return;
    handled.current = incoming;
    handleLinkResult(incoming, incomingKind);
    void navigate(".", { replace: true, state: null });
  }, [incoming, incomingKind, handleLinkResult, navigate]);

  return {
    notice,
    merge,
    closeNotice: useCallback(() => setNotice(null), []),
    closeMerge: useCallback(() => setMerge(null), []),
    finishMerge: useCallback(() => {
      if (merge) setNotice({ status: "merged", kind: merge.kind });
      setMerge(null);
    }, [merge]),
    handleLinkResult,
  };
}

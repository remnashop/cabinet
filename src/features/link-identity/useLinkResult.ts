import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import type { LinkResult, MergePreview } from "./api";

/** What the merge sheet needs: the backend's offer to fold the other account into this one. */
export interface MergeOffer {
  token: string;
  expiresIn: number; // seconds, from when the result arrived
  other: MergePreview;
}

export type LinkNotice = "linked" | "already_linked" | "merged";

const NOTICE_MS = 4000;

/**
 * One handler for every link flow (email in place, bot and OAuth via navigate("/profile", {state: {linkResult}})).
 * Owned by the profile page: it shows the notice and hands `merge` to the merge sheet.
 */
export function useLinkResult() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<LinkNotice | null>(null);
  const [merge, setMerge] = useState<MergeOffer | null>(null);

  const handleLinkResult = useCallback(
    (result: LinkResult) => {
      // refetch, never cache from the answer
      void queryClient.invalidateQueries({ queryKey: ["identities"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      if (result.status === "merge_required") {
        if (result.merge_token && result.other) {
          setMerge({
            token: result.merge_token,
            expiresIn: result.expires_in ?? 0,
            other: result.other,
          });
        }
        return;
      }
      setNotice(result.status);
    },
    [queryClient],
  );

  // a result brought by navigation is handled once and dropped from history, so Back or a reload can't replay it
  const incoming = (location.state as { linkResult?: LinkResult } | null)?.linkResult;
  const handled = useRef<LinkResult | null>(null);
  useEffect(() => {
    if (!incoming || handled.current === incoming) return;
    handled.current = incoming;
    handleLinkResult(incoming);
    void navigate(".", { replace: true, state: null });
  }, [incoming, handleLinkResult, navigate]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return {
    notice,
    merge,
    closeMerge: useCallback(() => setMerge(null), []),
    finishMerge: useCallback(() => {
      setMerge(null);
      setNotice("merged");
    }, []),
    handleLinkResult,
  };
}

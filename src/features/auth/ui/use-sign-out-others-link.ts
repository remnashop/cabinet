import { useEffect } from "react";
import { useSearchParams } from "react-router";

/** `?signout=others` (a notification's link) asks for the confirm: call onAsk and strip the param. */
export function useSignOutOthersLink(onAsk: () => void) {
  const [params, setParams] = useSearchParams();
  const asked = params.get("signout") === "others";
  useEffect(() => {
    if (!asked) return;
    onAsk();
    const next = new URLSearchParams(params);
    next.delete("signout");
    setParams(next, { replace: true });
  }, [asked]); // eslint-disable-line react-hooks/exhaustive-deps -- once per ask
}

import { useEffect, useRef, useState } from "react";
import { authApi } from "@/api/auth";
import { getInitDataRaw } from "@/lib/telegram";

export function useMiniAppAutoLogin(onSuccess: () => void): { attempting: boolean } {
  const [attempting, setAttempting] = useState(true);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const initData = getInitDataRaw();
    if (!initData) {
      setAttempting(false);
      return;
    }
    void (async () => {
      try {
        await authApi.loginTelegramWebApp(initData);
      } catch {
        setAttempting(false);
        return;
      }
      // Login succeeded — navigation errors must not drop the user back to the
      // login form, so onSuccess runs outside the login try/catch.
      onSuccess();
    })();
  }, [onSuccess]);

  return { attempting };
}

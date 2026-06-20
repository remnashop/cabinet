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
    authApi
      .loginTelegramWebApp(initData)
      .then(onSuccess)
      .catch(() => setAttempting(false));
  }, [onSuccess]);

  return { attempting };
}

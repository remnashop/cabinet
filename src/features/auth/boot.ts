import { authApi, completeLogin } from "@features/auth/api";
import { NetworkError, refreshSession } from "@shared/api/http";
import { getInitDataRaw } from "@shared/telegram";

export type BootResult = { kind: "authed" } | { kind: "anon" } | { kind: "error"; error: unknown };

/** Mini App: sign in by initData. Browser: restore the session from the stored refresh token. */
export async function bootSession(): Promise<BootResult> {
  const initData = getInitDataRaw();
  if (initData) {
    try {
      completeLogin(await authApi.telegram(initData));
      return { kind: "authed" };
    } catch (error) {
      return { kind: "error", error };
    }
  }
  const result = await refreshSession();
  if (result === "ok") return { kind: "authed" };
  if (result === "unavailable") return { kind: "error", error: new NetworkError("Session refresh failed") };
  return { kind: "anon" };
}

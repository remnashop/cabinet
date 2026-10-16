import { authApi, completeLogin } from "@features/auth/api";
import { classifyAuthError, NetworkError, refreshSession, setReauthenticator } from "@shared/api/http";
import { setAccessToken } from "@shared/api/tokens";
import { getInitDataRaw } from "@shared/telegram";

export type BootResult = { kind: "authed" } | { kind: "anon" } | { kind: "error"; error: unknown };

/** Mini App: initData signs in now and again whenever the access token expires. Browser: the refresh cookie. */
export async function bootSession(): Promise<BootResult> {
  const initData = getInitDataRaw();
  if (initData) {
    // web.telegram.org frames the app, where the refresh cookie is third-party
    setReauthenticator(async () => {
      try {
        setAccessToken(await authApi.telegram(initData));
        return "ok";
      } catch (err) {
        return classifyAuthError(err);
      }
    });
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

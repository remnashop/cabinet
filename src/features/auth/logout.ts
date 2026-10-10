import { authApi } from "@features/auth/api";
import { clearTokens, getRefreshToken } from "@shared/api/tokens";

/** Local sign-out never waits on the server: a failed revoke still logs out here. */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  clearTokens();
  if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
}

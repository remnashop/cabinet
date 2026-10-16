import { authApi } from "@features/auth/api";
import { clearAccessToken } from "@shared/api/tokens";

/** Revoke first: clearing the token leaves the page, and a reload before the revoke lands would sign back in.
 *  A failed revoke still signs out here. */
export async function logout(): Promise<void> {
  await authApi.logout().catch(() => undefined);
  clearAccessToken();
}

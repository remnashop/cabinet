import { authApi } from "@features/auth/api";
import { clearAccessToken } from "@shared/api/tokens";

/** Ends the session on the server; a failed revoke still lets the caller sign out. */
export const revokeSession = () => authApi.logout().catch(() => undefined);

/** Revoke first: clearing the token leaves the page, and a reload before the revoke lands would sign back in.
 *  A failed revoke still signs out here. */
export async function logout(): Promise<void> {
  await revokeSession();
  clearAccessToken();
}

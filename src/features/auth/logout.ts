import { pushApi } from "@entities/notification/api";
import { authApi } from "@features/auth/api";
import { clearAccessToken } from "@shared/api/tokens";
import { disablePush } from "@shared/lib/push";

/** Ends the session on the server; a failed revoke still lets the caller sign out. */
export const revokeSession = () => authApi.logout().catch(() => undefined);

/** Push off for this device, then the server session: the one order every sign-out follows.
 *  A failure of either must not keep the customer signed in. */
export async function endSession(): Promise<void> {
  await disablePush(pushApi, { optOut: false }).catch(() => undefined);
  await revokeSession();
}

/** Revoke first: clearing the token leaves the page, and a reload before the revoke lands would sign back in.
 *  A failed revoke still signs out here. */
export async function logout(): Promise<void> {
  await endSession();
  clearAccessToken();
}

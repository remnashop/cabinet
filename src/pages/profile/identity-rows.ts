import type { Identity } from "@entities/identity/api";
import type { AuthMethods } from "@features/auth/api";

/** A linked method always stays visible (it can be unlinked even if sign-in was switched off since);
 *  an unlinked one only while it can be used to connect. */
export function visibleIdentities(items: Identity[], methods: AuthMethods): Identity[] {
  const enabled: Record<Identity["kind"], boolean> = {
    TELEGRAM: methods.telegram_webapp || methods.telegram_deeplink || methods.oauth.includes("telegram"),
    EMAIL: methods.email,
    GOOGLE: methods.oauth.includes("google"),
    YANDEX: methods.oauth.includes("yandex"),
  };
  return items.filter((i) => i.linked || enabled[i.kind]);
}

export type RowAction = "unlink" | "connect" | "unlinkInBrowser" | "connectInBrowser" | null;

/** What a row offers. Inside the Mini App: Telegram stays (initData re-auth every ~15 min would register
 *  a fresh empty account without it), and Google/Yandex block OAuth in embedded WebViews. */
export function rowAction(identity: Identity, miniApp: boolean): RowAction {
  if (!miniApp) return identity.linked ? "unlink" : "connect";
  if (identity.kind === "TELEGRAM") return identity.linked ? "unlinkInBrowser" : null;
  if (identity.linked) return "unlink";
  return identity.kind === "EMAIL" ? "connect" : "connectInBrowser";
}

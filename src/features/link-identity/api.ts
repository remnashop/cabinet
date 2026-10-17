import type { Identity } from "@entities/identity/api";
import type { Deeplink } from "@features/auth/api";
import { redirectToProvider } from "@features/auth/oauth-redirect";
import { apiPost } from "@shared/api/http";
import { markOAuthLink } from "@shared/lib/oauth-link-marker";

export interface MergePreview {
  subscriptions: number;
  transactions: number;
  referrals: number;
  identities: Identity[];
}

// the answer of every link flow; merge_required carries the offer to merge the other account
export interface LinkResult {
  status: "linked" | "already_linked" | "merge_required";
  merge_token?: string | null;
  expires_in?: number | null;
  other?: MergePreview | null;
}

const BASE = "/users/me/identities";
const oauth = (provider: string) => `${BASE}/oauth/${encodeURIComponent(provider)}`;

export const linkApi = {
  sendEmailCode: (email: string, locale: string) => apiPost<null, object>(`${BASE}/email/code`, { email, locale }),
  verifyEmail: (email: string, code: string) => apiPost<LinkResult, object>(`${BASE}/email/verify`, { email, code }),
  telegramDeeplink: () => apiPost<Deeplink, object>(`${BASE}/telegram/deeplink`, {}),
  telegramSignin: (token: string) => apiPost<LinkResult, object>(`${BASE}/telegram/signin`, { token }),
  merge: (token: string) => apiPost<unknown, object>("/users/me/merge", { merge_token: token }),
  oauthCallback: (provider: string, code: string, state: string) =>
    apiPost<LinkResult, object>(`${oauth(provider)}/callback`, { code, state }),
};

/** Same round trip as sign-in, back through /login/callback/{provider}; the marker makes that page link instead. */
export async function startOAuthLink(provider: string): Promise<void> {
  const { url } = await apiPost<{ url: string }, object>(`${oauth(provider)}/authorize`, {});
  markOAuthLink(provider);
  redirectToProvider(url, "/profile");
}

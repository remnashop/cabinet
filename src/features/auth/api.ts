import { apiGet, apiPost } from "@shared/api/http";
import { setAccessToken, type AccessToken } from "@shared/api/tokens";
import { clearAttribution, readAttribution } from "@shared/lib/attribution";

export interface AuthMethods {
  telegram_webapp: boolean;
  telegram_deeplink: boolean;
  email: boolean;
  oauth: string[];
  // null: any domain may sign up
  allowed_email_domains: string[] | null;
}

export interface Deeplink {
  bot_url: string;
  expires_in: number;
}

const provider = (name: string) => `/auth/oauth/${encodeURIComponent(name)}`;

// legal_locale goes only with a sign-in that showed the notice (the backend records the acceptance)
const withLegal = (legal?: string) => (legal ? { legal_locale: legal } : {});

// the first step of every flow that may create a user carries the first-touch ref/ad;
// the Mini App's codes travel inside the signed initData instead
export const authApi = {
  methods: () => apiGet<AuthMethods>("/auth/methods"),
  telegram: (initData: string, legal?: string) =>
    apiPost<AccessToken, object>("/auth/telegram", { init_data: initData, ...withLegal(legal) }),
  sendEmailCode: (email: string, locale: string) =>
    apiPost<null, object>("/auth/email/code", {
      email,
      locale,
      ...readAttribution(),
    }),
  verifyEmail: (email: string, code: string, legal?: string) =>
    apiPost<AccessToken, object>("/auth/email/verify", { email, code, ...withLegal(legal) }),
  oauthAuthorize: (name: string) =>
    apiPost<{ url: string }, object>(`${provider(name)}/authorize`, {
      audience: "cabinet",
      ...readAttribution(),
    }),
  oauthCallback: (name: string, code: string, state: string) =>
    apiPost<AccessToken, object>(`${provider(name)}/callback`, { code, state }),
  deeplink: () =>
    apiPost<Deeplink, object>("/auth/telegram/deeplink", readAttribution()),
  botSignin: (token: string) =>
    apiPost<AccessToken, object>("/auth/telegram/signin", { token }),
  logout: () => apiPost<null, object>("/auth/logout", {}, undefined, true),
};

export function completeLogin(token: AccessToken): void {
  setAccessToken(token);
  clearAttribution();
}

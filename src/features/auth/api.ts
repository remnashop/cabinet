import { apiGet, apiPost } from "@shared/api/http";
import { setTokens, type Tokens } from "@shared/api/tokens";
import { clearAttribution, readAttribution } from "@shared/lib/attribution";

export interface AuthMethods {
  telegram_webapp: boolean;
  email: boolean;
  oauth: { provider: string; name: string }[];
}

const AUTH = "/cabinet/auth";
const provider = (name: string) => `${AUTH}/oauth/${encodeURIComponent(name)}`;

// every call that may create a user carries the first-touch ref/ad codes
export const authApi = {
  methods: () => apiGet<AuthMethods>(`${AUTH}/methods`),
  telegram: (initData: string) => apiPost<Tokens, object>(`${AUTH}/telegram`, { init_data: initData, ...readAttribution() }),
  sendEmailCode: (email: string) => apiPost<null, object>(`${AUTH}/email/code`, { email }),
  verifyEmail: (email: string, code: string) =>
    apiPost<Tokens, object>(`${AUTH}/email/verify`, { email, code, ...readAttribution() }),
  oauthAuthorize: (name: string, redirectUri: string) =>
    apiPost<{ url: string }, object>(`${provider(name)}/authorize`, { redirect_uri: redirectUri }),
  oauthCallback: (name: string, code: string, state: string) =>
    apiPost<Tokens, object>(`${provider(name)}/callback`, { code, state, ...readAttribution() }),
  logout: (refreshToken: string) => apiPost<null, object>(`${AUTH}/logout`, { refresh_token: refreshToken }),
};

export function completeLogin(tokens: Tokens): void {
  setTokens(tokens);
  clearAttribution();
}

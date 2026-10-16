import { http, HttpResponse } from "msw";

import { API_BASE } from "@shared/api/http";
import type { AccessToken } from "@shared/api/tokens";

const API = API_BASE;
const MOCK_CODE = "000000";
const MOCK_CSRF = "mock-csrf";

// the real refresh token is an httponly cookie MSW can't set; a sessionStorage flag stands in
// for it so a reload keeps the mock session the way the cookie keeps a real one
const SESSION_KEY = "mock_cabinet_session";
const hasSession = () => sessionStorage.getItem(SESSION_KEY) === "1";
const setSession = (value: boolean) =>
  value ? sessionStorage.setItem(SESSION_KEY, "1") : sessionStorage.removeItem(SESSION_KEY);
const MOCK_BOT_TOKEN = "mock_signin_token_0123456789";
const BOT_TOKEN_SPENT_KEY = "mock_bot_token_spent";
let issued = 0;

function signedIn() {
  setSession(true);
  issued += 1;
  const token: AccessToken = { access_token: `mock-access-${issued}`, expires_in: 900 };
  return HttpResponse.json(token, { headers: { "Set-Cookie": `cabinet_csrf_token=${MOCK_CSRF}; Path=/` } });
}

function apiError(status: number, code: string, detail: string) {
  return HttpResponse.json({ detail, code }, { status });
}

let me = {
  id: 1,
  name: "Dev User",
  email: null as string | null,
  telegram_id: null as number | null,
  username: null,
  language: "ru",
};

export const handlers = [
  http.get(`${API}/auth/methods`, () =>
    HttpResponse.json({
      telegram_webapp: true,
      telegram_deeplink: true,
      email: true,
      oauth: ["telegram", "google", "yandex"],
      allowed_email_domains: ["gmail.com", "yandex.ru", "mail.ru"],
    }),
  ),

  http.post(`${API}/auth/telegram`, async ({ request }) => {
    const { init_data } = (await request.json()) as { init_data?: string };
    if (!init_data) return apiError(401, "INVALID_INIT_DATA", "Invalid init data");
    me = { ...me, telegram_id: 100500 };
    return signedIn();
  }),

  http.post(`${API}/auth/email/code`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${API}/auth/email/verify`, async ({ request }) => {
    const { email, code } = (await request.json()) as { email: string; code: string };
    if (code !== MOCK_CODE) return apiError(401, "EMAIL_CODE_INVALID", "Invalid code");
    me = { ...me, email };
    return signedIn();
  }),

  http.post(`${API}/auth/oauth/:provider/authorize`, ({ params }) => {
    // skip the provider: straight back to our callback
    const url = new URL(`/login/callback/${String(params.provider)}`, window.location.origin);
    url.searchParams.set("code", "mock-code");
    url.searchParams.set("state", "mock-state");
    return HttpResponse.json({ url: url.toString() });
  }),

  http.post(`${API}/auth/oauth/:provider/callback`, () => signedIn()),

  http.post(`${API}/auth/telegram/deeplink`, () =>
    HttpResponse.json({ bot_url: "https://t.me/mock_bot?start=webauth_mock", expires_in: 300 }),
  ),

  // open /login/bot#token=mock_signin_token_0123456789 to play the bot's button; spent once per browser
  // (localStorage, so a reload or a new tab can't reuse it), clear localStorage to reset
  http.post(`${API}/auth/telegram/signin`, async ({ request }) => {
    const { token } = (await request.json()) as { token: string };
    if (token !== MOCK_BOT_TOKEN || localStorage.getItem(BOT_TOKEN_SPENT_KEY)) {
      return apiError(401, "DEEPLINK_EXPIRED", "The sign-in link has expired");
    }
    localStorage.setItem(BOT_TOKEN_SPENT_KEY, "1");
    me = { ...me, telegram_id: 100500 };
    return signedIn();
  }),

  http.post(`${API}/auth/refresh`, ({ request }) => {
    // the backend's order: no refresh cookie first, then the csrf check
    if (!hasSession()) return apiError(401, "REFRESH_TOKEN_MISSING", "No refresh token");
    if (request.headers.get("X-Csrf-Token") !== MOCK_CSRF) return apiError(403, "CSRF_FAILED", "CSRF check failed");
    return signedIn();
  }),

  // "bad" stands for a forged or truncated link
  http.post(`${API}/unsubscribe`, ({ request }) =>
    new URL(request.url).searchParams.get("token") === "bad"
      ? apiError(400, "UNSUBSCRIBE_TOKEN_INVALID", "Invalid unsubscribe token")
      : new HttpResponse(null, { status: 204 }),
  ),

  http.post(`${API}/auth/logout`, () => {
    setSession(false);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/me`, ({ request }) => {
    if (!request.headers.get("Authorization")?.startsWith("Bearer mock-access-")) {
      return apiError(401, "UNAUTHORIZED", "Not authenticated");
    }
    return HttpResponse.json(me);
  }),
];

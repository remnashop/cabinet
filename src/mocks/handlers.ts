import { http, HttpResponse } from "msw";

import type { Tokens } from "@shared/api/tokens";
import { getApiUrl } from "@shared/config";

const API = `${getApiUrl()}/cabinet`;
const MOCK_CODE = "000000";

let issued = 0;
function tokens(): Tokens {
  issued += 1;
  return { access_token: `mock-access-${issued}`, refresh_token: `mock-refresh-${issued}`, expires_in: 900 };
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
      email: true,
      oauth: [
        { provider: "telegram", name: "Telegram" },
        { provider: "github", name: "GitHub" },
      ],
    }),
  ),

  http.post(`${API}/auth/telegram`, async ({ request }) => {
    const { init_data } = (await request.json()) as { init_data?: string };
    if (!init_data) return apiError(401, "INVALID_INIT_DATA", "Invalid init data");
    me = { ...me, telegram_id: 100500 };
    return HttpResponse.json(tokens());
  }),

  http.post(`${API}/auth/email/code`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${API}/auth/email/verify`, async ({ request }) => {
    const { email, code } = (await request.json()) as { email: string; code: string };
    if (code !== MOCK_CODE) return apiError(400, "EMAIL_CODE_INVALID", "Invalid code");
    me = { ...me, email };
    return HttpResponse.json(tokens());
  }),

  http.post(`${API}/auth/oauth/:provider/authorize`, async ({ request }) => {
    const { redirect_uri } = (await request.json()) as { redirect_uri: string };
    // skip the provider: straight back to our callback
    const url = new URL(redirect_uri);
    url.searchParams.set("code", "mock-code");
    url.searchParams.set("state", "mock-state");
    return HttpResponse.json({ url: url.toString() });
  }),

  http.post(`${API}/auth/oauth/:provider/callback`, () => HttpResponse.json(tokens())),

  http.post(`${API}/auth/refresh`, async ({ request }) => {
    const { refresh_token } = (await request.json()) as { refresh_token?: string };
    if (!refresh_token?.startsWith("mock-refresh-")) return apiError(401, "UNAUTHORIZED", "Invalid refresh token");
    return HttpResponse.json(tokens());
  }),

  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API}/me`, ({ request }) => {
    if (!request.headers.get("Authorization")?.startsWith("Bearer mock-access-")) {
      return apiError(401, "UNAUTHORIZED", "Not authenticated");
    }
    return HttpResponse.json(me);
  }),
];

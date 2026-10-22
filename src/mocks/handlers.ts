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
  created_at: "2026-01-15T10:00:00Z",
  points: "120.00",
  bonus_days: 3,
  personal_discount: 10,
  purchase_discount: 0,
  loyalty_discount: 0,
};

const GB = 1024 ** 3;
const DAY = 86_400_000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

interface MockSubscription {
  id: number;
  status: "ACTIVE" | "LIMITED" | "EXPIRED" | "DISABLED" | "DELETED";
  is_trial: boolean;
  expire_at: string;
  url: string;
  effective_traffic_limit: number; // whole GB
  effective_device_limit: number;
  traffic_limit_strategy: string;
  plan_name: string;
  plan_id: number;
  used_traffic: number | null; // bytes
  link_reset_at: string | null;
}

let subscriptions: MockSubscription[] = [
  {
    id: 1,
    status: "ACTIVE",
    is_trial: false,
    expire_at: daysFromNow(27),
    url: "https://sub.example.com/premium",
    effective_traffic_limit: 100,
    effective_device_limit: 3,
    traffic_limit_strategy: "NO_RESET",
    plan_name: "Премиум",
    plan_id: 2,
    used_traffic: 12.4 * GB,
    link_reset_at: null,
  },
  {
    id: 2,
    status: "ACTIVE",
    is_trial: false,
    expire_at: daysFromNow(3),
    url: "https://sub.example.com/basic",
    effective_traffic_limit: 50,
    effective_device_limit: 2,
    traffic_limit_strategy: "NO_RESET",
    plan_name: "Базовый",
    plan_id: 1,
    used_traffic: 44 * GB,
    link_reset_at: null,
  },
];

const device = (hwid: string, platform: string, device_model: string) => ({
  hwid,
  platform,
  device_model,
  user_agent: "Happ/1.0",
  created_at: "2026-09-01T09:00:00Z",
});
const devices: Record<number, ReturnType<typeof device>[]> = {
  1: [device("hwid-1", "iOS", "iPhone 15"), device("hwid-2", "Windows", "Desktop PC")],
  2: [device("hwid-3", "Android", "Pixel 8")],
};

let trialAvailable = true;
let nextSubscriptionId = 3;

const PRICES: Record<number, number[]> = {
  1: [149, 399, 749, 1399],
  2: [299, 799, 1499, 2799],
  3: [499, 1299, 2399, 4499],
};
const DURATIONS = [30, 90, 180, 365];
const plan = (id: number, name: string, traffic: number, device_limit: number) => ({
  id,
  name,
  description: null,
  tag: id === 2 ? "popular" : null,
  type: "BOTH",
  traffic_limit: traffic,
  device_limit,
  is_trial: false,
  order_index: id,
  durations: DURATIONS.map((days, i) => ({
    days,
    order_index: i,
    prices: [
      { currency: "RUB", price: `${PRICES[id][i]}.00` },
      { currency: "XTR", price: String(Math.round(PRICES[id][i] / 2)) },
    ],
  })),
});
const catalog = [plan(1, "Базовый", 50, 2), plan(2, "Премиум", 100, 3), plan(3, "Безлимит", 0, 5)];

let referral = {
  referral_code: "IVAN42",
  referrer_id: null as number | null,
  points: "240.00",
  bonus_days: 5,
  counts_by_level: { "1": 5, "2": 2 },
  rewards: [
    { type: "POINTS", amount: "49.00", created_at: "2026-10-14T10:00:00Z" },
    { type: "EXTRA_DAYS", amount: "3", created_at: "2026-10-02T10:00:00Z" },
  ],
  program: {
    enabled: true,
    reward_type: "POINTS",
    reward_strategy: "PERCENT",
    reward_amounts: { "1": "10.00", "2": "5.00" },
    invitee_reward_type: "EXTRA_DAYS",
    invitee_reward_amount: 0,
  },
};

const PERSONAL_DISCOUNT = 10;

const identities = [
  { kind: "TELEGRAM", linked: true, label: "@dev" },
  { kind: "EMAIL", linked: false, label: null },
  { kind: "GOOGLE", linked: false, label: null },
  { kind: "YANDEX", linked: false, label: null },
];

const STATUSES = ["PAID", "PAID", "PENDING", "CANCELED", "FAILED", "PAID", "REFUNDED"];
const GATEWAYS = ["YOOKASSA", "TELEGRAM_STARS", "CRYPTOPAY"];
const historyTransactions = Array.from({ length: 25 }, (_, i) => {
  const stars = i % 3 === 1;
  return {
    id: 900 - i,
    status: STATUSES[i % STATUSES.length],
    final_price: stars ? "150" : String(149 + (i % 4) * 100),
    currency: stars ? "XTR" : "RUB",
    purchase_type: ["NEW", "RENEW", "CHANGE"][i % 3],
    gateway_type: GATEWAYS[i % 3],
    plan_name: ["Премиум", "Базовый", "Безлимит"][i % 3],
    duration_days: [30, 90, 365][i % 3],
    created_at: i === 24 ? null : daysFromNow(-i * 6 - 1),
  };
});

// order id -> how many times it was polled; PAID from the second poll
interface MockOrder {
  polls: number;
  body: {
    plan_id: number;
    duration_days: number;
    currency: string;
    purchase_type: string;
    gateway_type: string;
  };
}
// kept in sessionStorage: a browser payment leaves via a full-page redirect, which restarts the mocks
const ORDERS_KEY = "mock_orders";
const orders: Record<number, MockOrder> = JSON.parse(sessionStorage.getItem(ORDERS_KEY) ?? "{}");
const saveOrders = () => sessionStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
let nextOrderId = 100 + Object.keys(orders).length;

const MOCK_LINK_TOKEN = "mock_link_token_0123456789";

// a full-page OAuth round trip restarts the mocks, so only in-page links stay visible in the list
function linked(kind: string, label: string) {
  const identity = identities.find((i) => i.kind === kind);
  const already = identity?.linked ?? false;
  if (identity) Object.assign(identity, { linked: true, label });
  return HttpResponse.json({ status: already ? "already_linked" : "linked" });
}

function unauthorized(request: Request) {
  return request.headers.get("Authorization")?.startsWith("Bearer mock-access-")
    ? null
    : apiError(401, "NOT_AUTHENTICATED", "Not authenticated");
}

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
  http.get(`${API}/legal/documents`, ({ request }) => {
    const ru = new URL(request.url).searchParams.get("locale") === "ru";
    const items = [
      { kind: "USER_AGREEMENT", title: ru ? "Пользовательское соглашение" : "User agreement", body: "# Terms\n\nMock text.", revision_id: 1 },
      { kind: "PRIVACY_POLICY", title: ru ? "Политика конфиденциальности" : "Privacy policy", body: "# Privacy\n\nMock text.", revision_id: 1 },
      { kind: "OFFER", title: ru ? "Оферта" : "Offer", body: "# Offer\n\nMock text.", revision_id: 1 },
    ];
    return HttpResponse.json({ items, total: items.length });
  }),

  http.get(`${API}/cabinet/legal/pending`, () => HttpResponse.json({ items: [], total: 0, is_update: false })),
  http.post(`${API}/cabinet/legal/actions/accept`, () =>
    HttpResponse.json({ items: [], total: 0, is_update: false }),
  ),

  http.post(`${API}/unsubscribe`, ({ request }) =>
    new URL(request.url).searchParams.get("token") === "bad"
      ? apiError(400, "UNSUBSCRIBE_TOKEN_INVALID", "Invalid unsubscribe token")
      : new HttpResponse(null, { status: 204 }),
  ),

  http.post(`${API}/auth/logout`, () => {
    setSession(false);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/users/me`, ({ request }) => {
    if (!request.headers.get("Authorization")?.startsWith("Bearer mock-access-")) {
      return apiError(401, "UNAUTHORIZED", "Not authenticated");
    }
    return HttpResponse.json(me);
  }),

  http.get(
    `${API}/shop/public-settings`,
    ({ request }) =>
      unauthorized(request) ??
      HttpResponse.json({
        max_active_subscriptions: 3,
        device_single_reset_enabled: true,
        device_all_reset_enabled: true,
        link_reset_enabled: true,
        bot_username: "mock_bot",
      }),
  ),

  http.get(
    `${API}/subscriptions/me`,
    ({ request }) => unauthorized(request) ?? HttpResponse.json({ items: subscriptions, total: subscriptions.length }),
  ),

  http.get(
    `${API}/subscriptions/me/trial`,
    ({ request }) =>
      unauthorized(request) ??
      HttpResponse.json({
        is_available: trialAvailable,
        plan_name: "Пробный",
        duration_days: 3,
      }),
  ),

  http.post(`${API}/subscriptions/me/actions/activate-trial`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    if (!trialAvailable) return apiError(409, "TRIAL_NOT_AVAILABLE", "Trial is not available");
    trialAvailable = false;
    const created: MockSubscription = {
      id: nextSubscriptionId++,
      status: "ACTIVE",
      is_trial: true,
      expire_at: daysFromNow(3),
      url: "https://sub.example.com/trial",
      effective_traffic_limit: 5,
      effective_device_limit: 1,
      traffic_limit_strategy: "NO_RESET",
      plan_name: "Пробный",
      plan_id: 0,
      used_traffic: 0,
      link_reset_at: null,
    };
    subscriptions = [...subscriptions, created];
    devices[created.id] = [];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(`${API}/subscriptions/me/:id/devices`, ({ request, params }) => {
    const list = devices[Number(params.id)] ?? [];
    return unauthorized(request) ?? HttpResponse.json({ items: list, total: list.length });
  }),

  http.delete(`${API}/subscriptions/me/:id/devices/:hwid`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const id = Number(params.id);
    devices[id] = (devices[id] ?? []).filter((d) => d.hwid !== params.hwid);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/subscriptions/me/:id/devices/bulk/delete`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    devices[Number(params.id)] = [];
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/subscriptions/me/:id/actions/reissue`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const id = Number(params.id);
    subscriptions = subscriptions.map((sub) =>
      sub.id === id
        ? {
            ...sub,
            url: `${sub.url.split("?")[0]}?r=${Date.now()}`,
            link_reset_at: new Date().toISOString(),
          }
        : sub,
    );
    devices[id] = [];
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(
    `${API}/plans/catalog`,
    ({ request }) =>
      unauthorized(request) ??
      HttpResponse.json({
        items: catalog,
        total: catalog.length,
        anchor_currency: "RUB",
      }),
  ),

  http.get(
    `${API}/checkout/methods`,
    ({ request }) =>
      unauthorized(request) ??
      HttpResponse.json({
        items: [
          { gateway_type: "YOOKASSA", currency: "RUB", requires_email: true },
          {
            gateway_type: "TELEGRAM_STARS",
            currency: "XTR",
            requires_email: false,
          },
        ],
      }),
  ),

  http.post(`${API}/checkout/quote`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const body = (await request.json()) as {
      plan_id: number;
      duration_days: number;
      currency: string;
    };
    const price = catalog
      .find((p) => p.id === body.plan_id)
      ?.durations.find((d) => d.days === body.duration_days)
      ?.prices.find((p) => p.currency === body.currency)?.price;
    if (!price) return apiError(404, "PLAN_NOT_FOUND", "Plan not found");
    const base = Number(price);
    return HttpResponse.json({
      base_price: price,
      plan_discount_percent: 0,
      discount_percent: PERSONAL_DISCOUNT,
      discount_source: "PERSONAL",
      final_price: (base * (1 - PERSONAL_DISCOUNT / 100)).toFixed(2),
      currency: body.currency,
    });
  }),

  http.post(`${API}/checkout`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const body = (await request.json()) as MockOrder["body"];
    const orderId = nextOrderId++;
    orders[orderId] = { polls: 0, body };
    saveOrders();
    const url = new URL("/payment/result", window.location.origin);
    url.searchParams.set("order_id", String(orderId));
    return HttpResponse.json({ order_id: orderId, confirmation_url: url.toString() }, { status: 201 });
  }),

  http.get(`${API}/users/me/identities`, ({ request }) => unauthorized(request) ?? HttpResponse.json({ items: identities })),

  // linking: google links, yandex finds another account to merge; email code 000000;
  // the bot's button is played by /link/bot#token=mock_link_token_0123456789
  http.post(`${API}/users/me/identities/oauth/:provider/authorize`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const url = new URL(`/login/callback/${String(params.provider)}`, window.location.origin);
    url.searchParams.set("code", "mock-code");
    url.searchParams.set("state", crypto.randomUUID());
    return HttpResponse.json({ url: url.toString() });
  }),

  http.post(`${API}/users/me/identities/oauth/:provider/callback`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    if (params.provider !== "yandex") return linked("GOOGLE", "dev@gmail.com");
    return HttpResponse.json({
      status: "merge_required",
      merge_token: "mock-merge-token",
      expires_in: 600,
      other: {
        subscriptions: 2,
        transactions: 5,
        referrals: 1,
        identities: [{ kind: "YANDEX", linked: true, label: "ivan@yandex.ru" }],
      },
    });
  }),

  http.post(
    `${API}/users/me/identities/email/code`,
    ({ request }) => unauthorized(request) ?? new HttpResponse(null, { status: 204 }),
  ),

  http.post(`${API}/users/me/identities/email/verify`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const { email, code } = (await request.json()) as { email: string; code: string };
    // link errors come as 400: a 401 would read as a dead session
    if (code !== MOCK_CODE) return apiError(400, "EMAIL_CODE_INVALID", "Wrong code");
    return linked("EMAIL", email);
  }),

  http.post(`${API}/users/me/identities/telegram/deeplink`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const url = new URL("/link/bot", window.location.origin);
    url.hash = `token=${MOCK_LINK_TOKEN}`;
    return HttpResponse.json({ bot_url: url.toString(), expires_in: 300 });
  }),

  http.post(`${API}/users/me/identities/telegram/signin`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const { token } = (await request.json()) as { token: string };
    if (token !== MOCK_LINK_TOKEN) return apiError(400, "DEEPLINK_EXPIRED", "The sign-in link has expired");
    return linked("TELEGRAM", "@dev");
  }),

  http.post(`${API}/users/me/merge`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const { merge_token } = (await request.json()) as { merge_token: string };
    if (merge_token !== "mock-merge-token") return apiError(409, "MERGE_TOKEN_INVALID", "Merge token is invalid");
    me = { ...me, points: (Number(me.points) + 30).toFixed(2) };
    Object.assign(identities.find((i) => i.kind === "YANDEX")!, { linked: true, label: "ivan@yandex.ru" });
    return HttpResponse.json(me);
  }),

  http.delete(`${API}/users/me/identities/:kind`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const identity = identities.find((i) => i.kind === String(params.kind).toUpperCase());
    if (!identity?.linked) return new HttpResponse(null, { status: 204 });
    if (identities.filter((i) => i.linked).length <= 1) {
      return apiError(409, "LAST_SIGN_IN_METHOD", "Can't unlink the last sign-in method");
    }
    Object.assign(identity, { linked: false, label: null });
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${API}/users/me`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    me = { ...me, ...((await request.json()) as object) };
    return HttpResponse.json(me);
  }),

  http.get(`${API}/transactions/me`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const params = new URL(request.url).searchParams;
    const page = Number(params.get("page") ?? 1);
    const pageSize = Number(params.get("page_size") ?? 20);
    return HttpResponse.json({
      items: historyTransactions.slice((page - 1) * pageSize, page * pageSize),
      total: historyTransactions.length,
      page,
      page_size: pageSize,
    });
  }),

  http.get(`${API}/transactions/me/:id`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const id = Number(params.id);
    const order = orders[id];
    if (!order) return apiError(404, "PAYMENT_ORDER_NOT_FOUND", "Transaction not found");
    order.polls += 1;
    saveOrders();
    const plan = catalog.find((p) => p.id === order.body.plan_id);
    const price =
      plan?.durations
        .find((d) => d.days === order.body.duration_days)
        ?.prices.find((p) => p.currency === order.body.currency)?.price ?? "0";
    return HttpResponse.json({
      id,
      status: order.polls >= 2 ? "PAID" : "PENDING",
      final_price: (Number(price) * (1 - PERSONAL_DISCOUNT / 100)).toFixed(2),
      currency: order.body.currency,
      purchase_type: order.body.purchase_type,
      gateway_type: order.body.gateway_type,
      plan_name: plan?.name ?? "",
      duration_days: order.body.duration_days,
      created_at: new Date().toISOString(),
    });
  }),

  http.get(`${API}/referrals/me`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    return HttpResponse.json(referral);
  }),

  http.post(`${API}/referrals/me/actions/withdraw`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const { amount } = (await request.json()) as { amount: number };
    if (amount > Number(referral.points)) return apiError(400, "WITHDRAWAL_EXCEEDS_POINTS", "Too much");
    referral.points = (Number(referral.points) - amount).toFixed(2);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/referrals/me/actions/redeem-days`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const { subscription_id, days } = (await request.json()) as { subscription_id: number; days: number };
    const sub = subscriptions.find((s) => s.id === subscription_id);
    if (!sub) return apiError(404, "TARGET_SUBSCRIPTION_NOT_OWNED", "Not found");
    if (days > referral.bonus_days) return apiError(400, "BONUS_DAYS_INSUFFICIENT", "Not enough");
    referral.bonus_days -= days;
    sub.expire_at = new Date(new Date(sub.expire_at).getTime() + days * DAY).toISOString();
    return HttpResponse.json({ subscription_id, expire_at: sub.expire_at, bonus_days: referral.bonus_days, pending: false });
  }),

  http.post(`${API}/promocodes/activations`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const { code, target_subscription_id } = (await request.json()) as {
      code: string;
      target_subscription_id?: number;
    };
    const upper = code.trim().toUpperCase();
    if (upper === "NEEDSUB" && target_subscription_id === undefined) {
      return apiError(400, "TARGET_SUBSCRIPTION_REQUIRED", "Choose a subscription");
    }
    if (upper !== "PROMO" && upper !== "NEEDSUB") return apiError(404, "PROMOCODE_NOT_FOUND", "Promocode not found");
    return HttpResponse.json(
      {
        code: upper,
        reward_type: "DURATION",
        reward: 7,
        reward_duration_days: 7,
      },
      { status: 201 },
    );
  }),
];

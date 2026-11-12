import { http, HttpResponse } from "msw";

import { linkDigest } from "@entities/connect-guide/lib";
import { API_BASE } from "@shared/api/http";
import type { AccessToken } from "@shared/api/tokens";

import { loadScenario } from "./scenario";

const scenario = loadScenario();

const API = API_BASE;
const MOCK_CODE = "000000";
const MOCK_CSRF = "mock-csrf";
// any well-formed VAPID public key (65 bytes, base64url)
const MOCK_VAPID_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

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
  points: scenario.points.toFixed(2),
  bonus_days: scenario.bonusDays,
  personal_discount: scenario.discount,
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
  plan_traffic_limit: number;
  plan_device_limit: number;
  plan_traffic_limit_strategy: string;
  used_traffic: number | null; // bytes
  link_reset_at: string | null;
}

const soldTerms = (traffic: number, devices: number) => ({
  plan_traffic_limit: traffic,
  plan_device_limit: devices,
  plan_traffic_limit_strategy: "NO_RESET",
});
const TEMPLATES = [
  // sold on the catalog's current terms, so a renewal shows no "terms changed"
  { plan_name: "Премиум", plan_id: 2, url: "https://sub.example.com/premium", ...soldTerms(100, 3) },
  { plan_name: "Базовый", plan_id: 1, url: "https://sub.example.com/basic", ...soldTerms(50, 2) },
  { plan_name: "Безлимит", plan_id: 3, url: "https://sub.example.com/unlimited", ...soldTerms(0, 5) },
];
// the cards' alert demo: one card per look, [days left, % of 100 GB used, status]
const ALERT_DEMO: [number, number, MockSubscription["status"]][] = [
  [27, 12, "ACTIVE"], // calm
  [3, 12, "ACTIVE"], // orange: three days
  [1, 12, "ACTIVE"], // red: a day
  [40, 70, "ACTIVE"], // orange: 70% used
  [40, 95, "ACTIVE"], // red: 95% used
  [40, 100, "ACTIVE"], // used up: LIMITED
  [-2, 30, "EXPIRED"], // expired
];
let subscriptions: MockSubscription[] = scenario.alertDemo
  ? ALERT_DEMO.map(([days, used, status], i) =>
      limitedWhenUsedUp({
        ...TEMPLATES[i % TEMPLATES.length],
        id: i + 1,
        status,
        is_trial: false,
        expire_at: daysFromNow(days),
        effective_traffic_limit: 100,
        effective_device_limit: scenario.deviceLimit,
        traffic_limit_strategy: "NO_RESET",
        used_traffic: used * GB,
        link_reset_at: null,
      }),
    )
  : TEMPLATES.slice(0, scenario.subscriptions).map((template, i) => mockSubscription(template, i));

// as the panel: a subscription that has used up its traffic is LIMITED, not ACTIVE
function limitedWhenUsedUp(sub: MockSubscription): MockSubscription {
  const usedUp = sub.effective_traffic_limit > 0 && (sub.used_traffic ?? 0) >= sub.effective_traffic_limit * GB;
  return sub.status === "ACTIVE" && usedUp ? { ...sub, status: "LIMITED" } : sub;
}

function mockSubscription(template: (typeof TEMPLATES)[number], i: number): MockSubscription {
  return limitedWhenUsedUp({
  ...template,
  id: i + 1,
  status: i === 0 ? scenario.status : "ACTIVE",
  is_trial: i === 0 && scenario.trial,
  ...(i === 0 && scenario.trial ? { plan_name: "Пробный", plan_id: 0 } : {}),
  expire_at: daysFromNow(i === 0 ? scenario.daysLeft : 60 + i * 30),
  effective_traffic_limit: scenario.trafficLimit,
  effective_device_limit: scenario.deviceLimit,
  traffic_limit_strategy: "NO_RESET",
  used_traffic: (i === 0 ? scenario.trafficUsed : 12.4) * GB,
  link_reset_at: null,
  });
}

const device = (hwid: string, platform: string, device_model: string) => ({
  hwid,
  platform,
  device_model,
  user_agent: "Happ/1.0",
  created_at: "2026-09-01T09:00:00Z",
});
const MODELS: [string, string][] = [
  ["iOS", "iPhone 15"],
  ["Windows", "Desktop PC"],
  ["Android", "Pixel 8"],
  ["macOS", "MacBook Air"],
  ["Android", "Galaxy Tab"],
  ["Linux", "ThinkPad"],
];
const devices: Record<number, ReturnType<typeof device>[]> = Object.fromEntries(
  subscriptions.map((sub) => [
    sub.id,
    Array.from({ length: scenario.devices }, (_, i) => {
      const [platform, model] = MODELS[i % MODELS.length];
      return device(`hwid-${sub.id}-${i}`, platform, model);
    }),
  ]),
);

let trialAvailable = scenario.trialAvailable;
let nextSubscriptionId = subscriptions.length + 1;

const PRICES: Record<number, number[]> = {
  1: [149, 399, 749, 1399],
  2: [299, 799, 1499, 2799],
  3: [499, 1299, 2399, 4499],
};
const DURATIONS = [30, 90, 180, 365];
// one plan with both, one with the badge only, one with the description only
const PLAN_TEXT: Record<number, { description?: string; badge?: "POPULAR" | "BEST_VALUE" }> = {
  1: { description: "Для одного телефона и ноутбука: соцсети, почта, музыка" },
  2: { description: "Для всей семьи: видео в 4K, игры и звонки без задержек", badge: "POPULAR" },
  3: { badge: "BEST_VALUE" },
};
// the second plan runs a promotion: its catalog prices and the quote take it off
const PROMO: Record<number, number> = { 2: 20 };
const promoPrice = (price: number, currency: string, percent: number | undefined) =>
  percent ? (currency === "XTR" ? String(Math.round(price * (1 - percent / 100))) : (price * (1 - percent / 100)).toFixed(2)) : null;
const plan = (id: number, name: string, traffic: number, device_limit: number) => ({
  id,
  name,
  description: PLAN_TEXT[id]?.description ?? null,
  badge: PLAN_TEXT[id]?.badge ?? null,
  type: "BOTH",
  traffic_limit_strategy: "NO_RESET",
  traffic_limit: traffic,
  device_limit,
  is_trial: false,
  order_index: id,
  durations: DURATIONS.map((days, i) => ({
    days,
    order_index: i,
    prices: [
      { currency: "RUB", price: `${PRICES[id][i]}.00`, discounted_price: promoPrice(PRICES[id][i], "RUB", PROMO[id]) },
      {
        currency: "XTR",
        price: String(Math.round(PRICES[id][i] / 2)),
        discounted_price: promoPrice(Math.round(PRICES[id][i] / 2), "XTR", PROMO[id]),
      },
    ],
  })),
  discount_percent: PROMO[id] ?? 0,
  discount_ends_at: PROMO[id] ? daysFromNow(5) : null,
});
const catalog = [plan(1, "Базовый", 50, 2), plan(2, "Премиум", 100, 3), plan(3, "Безлимит", 0, 5)];
// the trial: out of the catalog, as on the backend; the quote still prices it
const TRIAL_PLAN = {
  ...plan(1, "Пробный", 10, 1),
  id: 9,
  description: null,
  badge: null,
  is_trial: true,
  durations: [
    {
      days: 3,
      order_index: 0,
      prices: scenario.trialPaid
        ? [
            { currency: "RUB", price: "49.00" },
            { currency: "XTR", price: "25" },
          ]
        : [
            { currency: "RUB", price: "0" },
            { currency: "XTR", price: "0" },
          ],
    },
  ],
};

let referral = {
  referral_code: "IVAN42",
  referrer_id: null as number | null,
  points: scenario.points.toFixed(2),
  bonus_days: scenario.bonusDays,
  counts_by_level: scenario.referralEmpty ? {} : { "1": 5, "2": 2, "3": 1 },
  program: {
    enabled: scenario.referral,
    reward_type: "POINTS",
    reward_strategy: "PERCENT",
    reward_amounts: { "1": "10.00", "2": "5.00", "3": "2.00" },
    invitee_reward_type: "EXTRA_DAYS",
    invitee_reward_amount: 3,
    accrual_strategy: "EVERY_PAYMENT",
    max_level: 3,
  },
};

const PERSONAL_DISCOUNT = scenario.discount;

const text = (ru: string, en: string) => ({ ru, en });
const guideApp = (id: string, name: string, store: string, template: string, featured = false) => ({
  id,
  name,
  featured,
  steps: [
    {
      title: text(`Установите ${name}`, `Install ${name}`),
      body: text("Скачайте приложение и откройте его один раз.", "Download the app and open it once."),
      icon: "download",
      buttons: [{ kind: "external", label: text("Скачать", "Download"), url: store }],
    },
    {
      title: text("Добавьте подписку", "Add the subscription"),
      body: text(
        "Нажмите «Добавить» — приложение откроется с вашей подпиской.",
        "Tap “Add” and the app opens with your subscription.",
      ),
      icon: "plus",
      buttons: [
        { kind: "deep_link", label: text("Добавить", "Add"), template, encode: "raw" },
        { kind: "copy_link", label: text("Скопировать ссылку", "Copy link") },
      ],
    },
    {
      title: text("Подключитесь", "Connect"),
      body: text("Выберите сервер и нажмите кнопку включения.", "Pick a server and tap the power button."),
      icon: "power",
      buttons: [],
    },
  ],
});
const APPLE = "https://apps.apple.com/app/happ-proxy-utility/id6504287215";
const GOOGLE = "https://play.google.com/store/apps/details?id=com.happproxy";
const connectGuide = {
  platforms: [
    {
      id: "ios",
      apps: [
        guideApp("happ", "Happ", APPLE, "happ://add/{{SUBSCRIPTION_LINK}}", true),
        guideApp("v2raytun", "v2RayTun", APPLE, "v2raytun://import/{{SUBSCRIPTION_LINK}}"),
      ],
    },
    {
      id: "android",
      apps: [
        guideApp("happ", "Happ", GOOGLE, "happ://add/{{SUBSCRIPTION_LINK}}", true),
        guideApp("hiddify", "Hiddify", GOOGLE, "hiddify://import/{{SUBSCRIPTION_LINK}}"),
      ],
    },
    { id: "windows", apps: [guideApp("happ", "Happ", APPLE, "happ://add/{{SUBSCRIPTION_LINK}}", true)] },
    { id: "macos", apps: [guideApp("happ", "Happ", APPLE, "happ://add/{{SUBSCRIPTION_LINK}}", true)] },
    // no app: the "not available" screen
    { id: "linux", apps: [] },
    { id: "androidtv", apps: [guideApp("happ", "Happ", GOOGLE, "happ://add/{{SUBSCRIPTION_LINK}}", true)] },
    { id: "appletv", apps: [guideApp("happ", "Happ", APPLE, "happ://add/{{SUBSCRIPTION_LINK}}", true)] },
  ],
};

const identities = [
  { kind: "TELEGRAM", linked: true, label: "@dev" },
  { kind: "EMAIL", linked: false, label: null },
  { kind: "GOOGLE", linked: false, label: null },
  { kind: "YANDEX", linked: false, label: null },
];

const STATUSES = ["PAID", "PAID", "PENDING", "CANCELED", "FAILED", "PAID", "REFUNDED"];
const GATEWAYS = ["YOOKASSA", "TELEGRAM_STARS", "CRYPTOPAY"];
// [plan's own %, user %, the user discount's source]: some orders discounted every way, to look at the strike
const HISTORY_DISCOUNTS: [number, number, string][] = [
  [0, 10, "LOYALTY"],
  [0, 0, "NONE"],
  [20, 0, "NONE"],
  [10, 5, "PERSONAL"],
];
const historyTransactions = Array.from({ length: 25 }, (_, i) => {
  const stars = i % 3 === 1;
  const base = stars ? 150 : 149 + (i % 4) * 100;
  const [planPercent, userPercent, source] = stars ? [0, 0, "NONE"] : HISTORY_DISCOUNTS[i % 4];
  return {
    id: 900 - i,
    status: STATUSES[i % STATUSES.length],
    final_price: String(Math.round(base * (1 - planPercent / 100) * (1 - userPercent / 100))),
    base_price: String(base),
    plan_discount_percent: planPercent,
    discount_percent: userPercent,
    discount_source: source,
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
    target_subscription_id?: number;
  };
}
// kept in sessionStorage: a browser payment leaves via a full-page redirect, which restarts the mocks
const ORDERS_KEY = "mock_orders";
const orders: Record<number, MockOrder> = JSON.parse(sessionStorage.getItem(ORDERS_KEY) ?? "{}");
const saveOrders = () => sessionStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
let nextOrderId = 100 + Object.keys(orders).length;

const MOCK_LINK_TOKEN = "mock_link_token_0123456789";

// the backend's signature is an HMAC; the mock's is the link's digest, which verify compares against. A phone on the
// LAN over plain http has no crypto.subtle: no signature then, only the Mini App hop (which needs it too) is lost
const mockSignature = async (url: string) => (crypto.subtle ? linkDigest(url) : "");

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

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
let notificationsRead = false;
let notificationsCleared = false;
const notificationItems = () =>
  [
    { id: 20, event_type: "PaymentsRestored", title: "Оплата снова доступна", body: "Теперь можно оформить или продлить подписку.", url: "/purchase", created_at: minutesAgo(1), read: false },
    { id: 19, event_type: "SubscriptionPurchasedEvent", title: "Подписка активирована", body: "Осталось подключить устройство — это займёт пару минут.", url: "/?sub=1", created_at: minutesAgo(5), read: false },
    { id: 18, event_type: "SubscriptionRenewedEvent", title: "Подписка продлена", body: "Срок подписки увеличен на 30 дней.", url: "/?sub=1", created_at: minutesAgo(30), read: false },
    { id: 17, event_type: "SubscriptionChangedEvent", title: "Тариф изменён", body: "Подключение остаётся прежним, ничего настраивать не нужно.", url: "/?sub=1", created_at: minutesAgo(60), read: false },
    { id: 16, event_type: "SubscriptionAddOnGrantedEvent", title: "Дополнение активировано", body: "К подписке добавлено 50 ГБ трафика.", url: "/?sub=1", created_at: minutesAgo(90), read: true },
    { id: 15, event_type: "SubscriptionGrantedEvent", title: "Подписка выдана", body: "Доступ открыт на 30 дней. Подключите устройство, чтобы начать пользоваться.", url: "/?sub=1", created_at: minutesAgo(120), read: true },
    { id: 14, event_type: "TransactionRefundedEvent", title: "Платёж возвращён", body: "299 ₽ вернутся тем же способом, которым вы платили.", url: "/profile/payments", created_at: minutesAgo(150), read: true },
    { id: 13, event_type: "TransactionPartiallyRefundedEvent", title: "Частичный возврат", body: "Часть платежа, 100 ₽, вернётся тем же способом, которым вы платили.", url: "/profile/payments", created_at: minutesAgo(180), read: true },
    { id: 12, event_type: "PaidOrderNotFulfilledEvent", title: "Выдача задерживается", body: "Оплата 299 ₽ получена, но подписка выдаётся дольше обычного. Мы уже разбираемся; если она скоро не появится, напишите в поддержку.", url: "/profile/payments", created_at: minutesAgo(210), read: true },
    { id: 11, event_type: "SubscriptionExpiringEvent", title: "Подписка скоро закончится", body: "Доступ сохранится ещё 3 дня. Продлите подписку, чтобы не потерять его.", url: "/?sub=1&renew=1", created_at: minutesAgo(240), read: true },
    { id: 10, event_type: "SubscriptionExpiredEvent", title: "Подписка закончилась", body: "Продлите подписку, чтобы вернуть доступ.", url: "/?sub=1&renew=1", created_at: minutesAgo(270), read: true },
    { id: 9, event_type: "SubscriptionTrafficThresholdEvent", title: "Трафик на исходе", body: "Продлите подписку, чтобы не потерять доступ.", url: "/?sub=1&renew=1", created_at: minutesAgo(300), read: true },
    { id: 8, event_type: "SubscriptionTrafficLimitedEvent", title: "Трафик закончился", body: "Продлите подписку, чтобы вернуть доступ.", url: "/?sub=1&renew=1", created_at: minutesAgo(330), read: true },
    { id: 7, event_type: "SubscriptionNotConnectedEvent", title: "Пора подключиться", body: "Вы оформили подписку 5 ч назад, но ещё ни разу ею не воспользовались. Настройка займёт пару минут.", url: "/subscription/1/connect", created_at: minutesAgo(360), read: true },
    { id: 6, event_type: "TorrentBlockerReportEvent", title: "Торренты запрещены", body: "Торрент-трафик через VPN заблокирован. При повторных нарушениях доступ может быть ограничен.", url: "/?sub=1", created_at: minutesAgo(390), read: true },
    { id: 5, event_type: "CabinetNewDeviceSignInEvent", title: "Новый вход", body: "В кабинет вошли с 1.2.3.4 (Firefox). Если это были не вы — выйдите на всех других устройствах и напишите в поддержку.", url: "/profile?signout=others", created_at: minutesAgo(420), read: true },
    { id: 4, event_type: "AccountsMergedEvent", title: "Аккаунты объединены", body: "Подписки, платежи и способы входа другого аккаунта теперь здесь. Если это были не вы — напишите в поддержку.", url: "/profile?support=1", created_at: minutesAgo(450), read: true },
    { id: 3, event_type: "ReferralRewardIssuedEvent", title: "Награда за друга", body: "Вам начислено 3 бонусных дня — спасибо, что пригласили!", url: "/invite/friends", created_at: minutesAgo(480), read: true },
    { id: 2, event_type: "InviteeRewardIssuedEvent", title: "Приветственный бонус", body: "Вам начислено 3 бонусных дня за регистрацию по приглашению.", url: "/profile", created_at: minutesAgo(510), read: true },
    { id: 1, event_type: "PromocodeDiscountExpiringEvent", title: "Скидка скоро сгорит", body: "10% по промокоду SALE действуют ещё 1 ч. Успейте оформить покупку.", url: "/purchase", created_at: minutesAgo(540), read: true },
  ].map((item) => ({ ...item, read: item.read || notificationsRead }));
const pushSubscriptions: { id: number; endpoint: string; user_agent: string | null; created_at: string; last_seen_at: string | null }[] = [];
let pushIssued = 0;

// long enough to scroll the document dialog
const longDoc = (name: string) =>
  `# ${name}\n\n` +
  Array.from(
    { length: 8 },
    (_, i) =>
      `## ${i + 1}. Section\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\n- First point of the section\n- Second point, with a [link](https://example.com)\n- Third point\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.`,
  ).join("\n\n");

// the re-acceptance gate's documents, until accepted on this load
let legalAccepted = false;
const pendingLegal = () =>
  scenario.legalPending && !legalAccepted
    ? {
        items: [
          { kind: "USER_AGREEMENT", title: "Пользовательское соглашение", body: longDoc("Terms"), revision_id: 2, created_at: "2026-10-20T10:00:00Z" },
          { kind: "PRIVACY_POLICY", title: "Политика конфиденциальности", body: longDoc("Privacy"), revision_id: 2, created_at: "2026-10-20T10:00:00Z" },
        ],
        total: 2,
        is_update: true,
      }
    : { items: [], total: 0, is_update: false };

export const handlers = [
  // first: falls through (returns nothing) unless the scenario breaks requests; sign-in and the documents stay up,
  // so the cabinet still opens onto its error cards
  http.all(`${API}/*`, ({ request }) => {
    const path = new URL(request.url).pathname;
    if (scenario.restricted && !/\/(auth|legal|appearance)\//.test(path)) {
      return apiError(403, "ACCESS_RESTRICTED", "The service is temporarily closed");
    }
    if (scenario.failRequests === "none" || /\/(auth|legal)\//.test(path)) return;
    return scenario.failRequests === "network" ? HttpResponse.error() : apiError(500, "INTERNAL", "Mock failure");
  }),
  http.get(`${API}/auth/methods`, () =>
    HttpResponse.json({
      telegram_webapp: true,
      telegram_deeplink: !scenario.miniAppOnly,
      email: !scenario.miniAppOnly,
      oauth: scenario.miniAppOnly ? [] : ["telegram", "google", "yandex"],
      allowed_email_domains: ["gmail.com", "yandex.ru", "mail.ru"],
      captcha: null,
      bot_username: "mock_bot",
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
      { kind: "USER_AGREEMENT", title: ru ? "Пользовательское соглашение" : "User agreement", body: longDoc("Terms"), revision_id: 1 },
      { kind: "PRIVACY_POLICY", title: ru ? "Политика конфиденциальности" : "Privacy policy", body: longDoc("Privacy"), revision_id: 1 },
      { kind: "OFFER", title: ru ? "Оферта" : "Offer", body: longDoc("Offer"), revision_id: 1 },
    ];
    return HttpResponse.json({ items, total: items.length });
  }),

  http.get(`${API}/cabinet/legal/pending`, () => HttpResponse.json(pendingLegal())),
  http.post(`${API}/cabinet/legal/actions/accept`, () => {
    legalAccepted = true;
    return HttpResponse.json(pendingLegal());
  }),

  http.post(`${API}/unsubscribe`, ({ request }) =>
    new URL(request.url).searchParams.get("token") === "bad"
      ? apiError(400, "UNSUBSCRIBE_TOKEN_INVALID", "Invalid unsubscribe token")
      : new HttpResponse(null, { status: 204 }),
  ),

  http.post(`${API}/auth/sessions/actions/revoke-others`, () => new HttpResponse(null, { status: 204 })),

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

  http.get(`${API}/appearance/:target`, () =>
    HttpResponse.json({
      brand_name: null,
      primary_color: null,
      shader_palette: null,
      shader_enabled: true,
      has_logo: false,
      has_favicon: false,
    }),
  ),

  http.get(
    `${API}/shop/public-settings`,
    ({ request }) =>
      unauthorized(request) ??
      HttpResponse.json({
        max_active_subscriptions: scenario.maxActive,
        device_single_reset_enabled: scenario.deviceReset,
        device_all_reset_enabled: scenario.deviceReset,
        link_reset_enabled: true,
        bot_username: "mock_bot",
        support_telegram: "mock_support",
        support_url: "https://example.com/support",
        payments_enabled: scenario.paymentsEnabled,
      }),
  ),

  // zero-session, like the backend's
  http.get(`${API}/shop/connect-guide`, () =>
    HttpResponse.json(scenario.connectGuide ? connectGuide : { platforms: [] }),
  ),

  http.get(`${API}/subscriptions/me`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const items = await Promise.all(subscriptions.map(async (sub) => ({ ...sub, connect_signature: await mockSignature(sub.url) })));
    return HttpResponse.json({ items, total: items.length });
  }),

  http.post(`${API}/shop/connect-guide/verify`, async ({ request }) => {
    const { digest, signature } = (await request.json()) as { digest: string; signature: string };
    return HttpResponse.json({ valid: digest === signature });
  }),

  http.get(
    `${API}/subscriptions/me/trial`,
    ({ request }) =>
      unauthorized(request) ??
      HttpResponse.json({
        is_available: trialAvailable,
        plan_id: TRIAL_PLAN.id,
        plan_name: TRIAL_PLAN.name,
        duration_days: 3,
        is_free: !scenario.trialPaid,
        price: scenario.trialPaid ? "49.00" : "0",
        currency: "RUB",
        prices: TRIAL_PLAN.durations[0].prices,
      }),
  ),

  http.post(`${API}/subscriptions/me/actions/activate-trial`, async ({ request }) => {
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
      ...soldTerms(5, 1),
      used_traffic: 0,
      link_reset_at: null,
    };
    subscriptions = [...subscriptions, created];
    devices[created.id] = [];
    return HttpResponse.json({ ...created, connect_signature: await mockSignature(created.url) }, { status: 201 });
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
          { gateway_type: "ROBOKASSA", currency: "RUB", requires_email: false },
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
    const price = [...catalog, TRIAL_PLAN]
      .find((p) => p.id === body.plan_id)
      ?.durations.find((d) => d.days === body.duration_days)
      ?.prices.find((p) => p.currency === body.currency)?.price;
    if (!price) return apiError(404, "PLAN_NOT_FOUND", "Plan not found");
    const base = Number(price);
    const promo = PROMO[body.plan_id] ?? 0;
    return HttpResponse.json({
      base_price: price,
      plan_discount_percent: promo,
      discount_percent: PERSONAL_DISCOUNT,
      discount_source: "PERSONAL",
      final_price: (base * (1 - promo / 100) * (1 - PERSONAL_DISCOUNT / 100)).toFixed(2),
      currency: body.currency,
    });
  }),

  http.post(`${API}/checkout/waitlist`, ({ request }) => unauthorized(request) ?? new HttpResponse(null, { status: 204 })),

  http.post(`${API}/checkout`, async ({ request }) => {
    if (!scenario.paymentsEnabled) return apiError(403, "PAYMENTS_DISABLED", "Payments are disabled");
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
      status: order.polls >= 2 ? scenario.paymentOutcome : "PENDING",
      final_price: (Number(price) * (1 - PERSONAL_DISCOUNT / 100)).toFixed(2),
      base_price: price,
      plan_discount_percent: 0,
      discount_percent: PERSONAL_DISCOUNT,
      discount_source: PERSONAL_DISCOUNT > 0 ? "PERSONAL" : "NONE",
      currency: order.body.currency,
      purchase_type: order.body.purchase_type,
      gateway_type: order.body.gateway_type,
      plan_name: plan?.name ?? "",
      duration_days: order.body.duration_days,
      created_at: new Date().toISOString(),
      plan_id: order.body.plan_id,
      target_subscription_id: order.body.target_subscription_id ?? null,
    });
  }),

  http.get(`${API}/referrals/me`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    return HttpResponse.json(referral);
  }),

  // eight invitees to match the counts: five on level 1, two on level 2, one on level 3, some of them paying
  http.get(`${API}/referrals/me/invited`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    if (scenario.referralEmpty) return HttpResponse.json({ items: [], total: 0 });
    const names = ["Анна", "Максим", "Ольга К.", "Дмитрий", "Sofia", "Игорь", "Катя", "Лев"];
    const items = names.map((name, i) => ({
      name,
      level: i < 5 ? 1 : i < 7 ? 2 : 3,
      created_at: daysFromNow(-(i * 9 + 2)),
      reward_amounts: i % 3 === 0 ? { POINTS: String(49 - i * 4) } : i === 4 ? { EXTRA_DAYS: "3" } : {},
    }));
    return HttpResponse.json({ items, total: items.length });
  }),

  // the backend's rule: no trial, disabled or deleted one, nor an inactive one whose traffic never comes back
  http.get(`${API}/referrals/me/redeem-targets`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const spentForGood = (s: MockSubscription) =>
      s.traffic_limit_strategy === "NO_RESET" &&
      s.effective_traffic_limit > 0 &&
      (s.used_traffic ?? 0) >= s.effective_traffic_limit * GB;
    const ids = subscriptions
      .filter((s) => !s.is_trial && s.status !== "DISABLED" && s.status !== "DELETED")
      .filter((s) => s.status === "ACTIVE" || !spentForGood(s))
      .map((s) => s.id);
    return HttpResponse.json({ subscription_ids: ids });
  }),

  http.get(`${API}/notifications/me`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    if (scenario.feed === "error") return apiError(500, "INTERNAL", "Mock failure");
    // the unread count follows what mark-read did; the items keep their flags only until the next load
    const items = scenario.feed === "empty" || notificationsCleared ? [] : notificationItems();
    return HttpResponse.json({ items, unread_count: items.filter((i) => !i.read).length });
  }),

  http.post(`${API}/notifications/me/actions/clear`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    notificationsCleared = true;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/notifications/me/actions/mark-read`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    notificationsRead = true;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/notifications/me/push/public-key`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    return HttpResponse.json({ public_key: scenario.pushConfigured ? MOCK_VAPID_KEY : null });
  }),

  http.get(`${API}/notifications/me/push-subscriptions`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    return HttpResponse.json({ items: pushSubscriptions, total: pushSubscriptions.length });
  }),

  http.post(`${API}/notifications/me/push-subscriptions`, async ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const { endpoint } = (await request.json()) as { endpoint: string };
    const known = pushSubscriptions.find((s) => s.endpoint === endpoint);
    if (known) return HttpResponse.json(known);
    pushIssued += 1;
    const created = { id: pushIssued, endpoint, user_agent: navigator.userAgent, created_at: new Date().toISOString(), last_seen_at: null };
    pushSubscriptions.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete(`${API}/notifications/me/push-subscriptions/:id`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const index = pushSubscriptions.findIndex((s) => s.id === Number(params.id));
    if (index < 0) return apiError(404, "NOT_FOUND", "Not found");
    pushSubscriptions.splice(index, 1);
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

  // NEEDSUB gives days: the backend's rule keeps a trial out and takes an active one (an expired one with traffic left too)
  http.get(`${API}/promocodes/targets`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const code = (new URL(request.url).searchParams.get("code") ?? "").trim().toUpperCase();
    if (code !== "NEEDSUB") return HttpResponse.json({ subscription_ids: [] });
    const ids = subscriptions.filter((s) => !s.is_trial && s.status === "ACTIVE").map((s) => s.id);
    return HttpResponse.json({ subscription_ids: ids });
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

import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { detectPushSupport, disablePush, healPushSubscription, type PushApi } from "@shared/lib/push";

const OPT_OUT = "remnashop_cabinet_push_optout";

function stubBrowser(subscription: unknown) {
  const registration = { pushManager: { getSubscription: vi.fn().mockResolvedValue(subscription) } };
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", { permission: "granted", requestPermission: vi.fn().mockResolvedValue("granted") });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
  return registration;
}

function makeApi(endpoints: { id: number; endpoint: string }[] = []): PushApi {
  return {
    getPublicKey: vi.fn().mockResolvedValue("AAAA"),
    subscribe: vi.fn().mockResolvedValue(undefined),
    listEndpoints: vi.fn().mockResolvedValue(endpoints),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

it("asks an iPhone without PushManager to install the app", () => {
  vi.stubGlobal("PushManager", undefined);
  Reflect.deleteProperty(window, "PushManager");
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)");
  expect(detectPushSupport()).toBe("ios-needs-install");
  vi.restoreAllMocks();
});

it("disablePush with optOut remembers it, removes its endpoint and unsubscribes", async () => {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  stubBrowser({ endpoint: "https://push/1", unsubscribe });
  const api = makeApi([{ id: 7, endpoint: "https://push/1" }]);
  await disablePush(api, { optOut: true });
  expect(localStorage.getItem(OPT_OUT)).toBe("1");
  expect(api.remove).toHaveBeenCalledWith(7);
  expect(unsubscribe).toHaveBeenCalled();
});

it("heal does nothing after an opt-out", async () => {
  stubBrowser(null);
  localStorage.setItem(OPT_OUT, "1");
  const api = makeApi();
  await healPushSubscription(api);
  expect(api.getPublicKey).not.toHaveBeenCalled();
});

it("heal re-subscribes a subscription the server does not know", async () => {
  stubBrowser({
    endpoint: "https://push/old",
    options: {},
    toJSON: () => ({ keys: { p256dh: "p", auth: "a" } }),
  });
  const api = makeApi([]);
  await healPushSubscription(api);
  expect(api.subscribe).toHaveBeenCalledWith({
    endpoint: "https://push/old",
    keys: { p256dh: "p", auth: "a" },
  });
});

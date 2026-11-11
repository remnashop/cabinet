// What the mock backend serves, picked in the debug panel; kept in localStorage, applied by reloading the page
// (the handlers read it once, at load).

export type MockStatus = "ACTIVE" | "LIMITED" | "EXPIRED" | "DISABLED";
export type MockPaymentOutcome = "PAID" | "CANCELED" | "FAILED" | "PENDING";
export type MockFailure = "none" | "server" | "network";
export type MockFeed = "normal" | "empty" | "error";

export interface Scenario {
  subscriptions: number;
  maxActive: number | null; // null = no cap
  trial: boolean; // the first subscription is a trial
  trialAvailable: boolean;
  trialPaid: boolean; // the trial is bought at checkout, not activated
  status: MockStatus; // the first subscription's
  daysLeft: number; // the first subscription's
  deviceLimit: number; // 0 = unlimited
  devices: number; // connected to each subscription
  trafficLimit: number; // whole GB, 0 = unlimited
  trafficUsed: number; // GB, the first subscription's; the others have used 12.4
  deviceReset: boolean;
  points: number;
  bonusDays: number;
  discount: number;
  referral: boolean;
  referralEmpty: boolean; // nobody invited yet
  connectGuide: boolean; // the dashboard's connect guide on, or the "not available" screen
  alertDemo: boolean; // seven cards, one per look (calm, orange and red by days and traffic, limited, expired)
  paymentOutcome: MockPaymentOutcome; // what an order turns into from its second poll; PENDING runs into the timeout
  failRequests: MockFailure; // every call but sign-in and the documents fails: a 500 or no answer, for the error cards
  legalPending: boolean; // the admin asked to accept the documents again: the re-acceptance gate
  miniAppOnly: boolean; // every browser sign-in off: the login page sends to the bot
  feed: MockFeed; // the bell's notifications
  pushConfigured: boolean; // the backend has a VAPID key
  restricted: boolean; // the admin closed the service: every call but sign-in answers ACCESS_RESTRICTED
  paymentsEnabled: boolean;
}

export const DEFAULT_SCENARIO: Scenario = {
  subscriptions: 2,
  maxActive: 3,
  trial: false,
  trialAvailable: true,
  trialPaid: false,
  status: "ACTIVE",
  daysLeft: 27,
  deviceLimit: 3,
  devices: 2,
  trafficLimit: 100,
  trafficUsed: 100,
  deviceReset: true,
  points: 120,
  bonusDays: 3,
  discount: 10,
  referral: false,
  referralEmpty: false,
  connectGuide: true,
  alertDemo: false,
  paymentOutcome: "PAID",
  failRequests: "none",
  legalPending: false,
  miniAppOnly: false,
  feed: "normal",
  pushConfigured: true,
  restricted: false,
  paymentsEnabled: true,
};

// bumped when the defaults change, so a saved scenario doesn't hide them
const KEY = "mock_scenario_v6";

export function loadScenario(): Scenario {
  try {
    return { ...DEFAULT_SCENARIO, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Scenario>) };
  } catch {
    return DEFAULT_SCENARIO;
  }
}

export function saveScenario(scenario: Scenario | null) {
  if (scenario) localStorage.setItem(KEY, JSON.stringify(scenario));
  else localStorage.removeItem(KEY);
  location.reload();
}

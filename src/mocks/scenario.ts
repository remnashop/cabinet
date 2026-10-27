// What the mock backend serves, picked in the debug panel; kept in localStorage, applied by reloading the page
// (the handlers read it once, at load).

export type MockStatus = "ACTIVE" | "LIMITED" | "EXPIRED" | "DISABLED";

export interface Scenario {
  subscriptions: number;
  maxActive: number | null; // null = no cap
  trial: boolean; // the first subscription is a trial
  trialAvailable: boolean;
  status: MockStatus; // the first subscription's
  daysLeft: number; // the first subscription's
  deviceLimit: number; // 0 = unlimited
  devices: number; // connected to each subscription
  trafficLimit: number; // whole GB, 0 = unlimited
  trafficUsed: number; // GB
  deviceReset: boolean;
  points: number;
  bonusDays: number;
  discount: number;
  referral: boolean;
  connectGuide: boolean; // the dashboard's connect guide on, or the plain link page
}

export const DEFAULT_SCENARIO: Scenario = {
  subscriptions: 1,
  maxActive: 1,
  trial: false,
  trialAvailable: true,
  status: "ACTIVE",
  daysLeft: 27,
  deviceLimit: 3,
  devices: 2,
  trafficLimit: 100,
  trafficUsed: 12.4,
  deviceReset: true,
  points: 0,
  bonusDays: 3,
  discount: 10,
  referral: false,
  connectGuide: true,
};

const KEY = "mock_scenario";

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

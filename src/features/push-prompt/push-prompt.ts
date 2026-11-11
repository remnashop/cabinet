import { readStorage, removeStorage, writeStorage } from "@shared/lib/safe-storage";

// reiwa's push prompt: offered on the home page right after something was bought or started, answered once per browser.
// The moment: this tab, for 30 minutes (sessionStorage); the answer: this browser, forever (localStorage). Only an
// answer is recorded, not a showing: a remount (a reload, a page and back) would otherwise hide a card the customer
// never got to read; left unanswered, it goes when the 30 minutes do.
const ELIGIBLE_KEY = "remnashop_cabinet_push_prompt_eligible";
const RECORD_KEY = "remnashop_cabinet_push_prompt";
const ELIGIBLE_MS = 30 * 60 * 1000;

export type PushPromptRecord = "accepted" | "denied" | "failed" | "dismissed";

/** A payment came back paid or a trial started: offer push on the home page. */
export function markPushPromptEligible(now = Date.now()): void {
  writeStorage(ELIGIBLE_KEY, String(now), "session");
}

export function isPushPromptEligible(now = Date.now()): boolean {
  const at = Number(readStorage(ELIGIBLE_KEY, "session"));
  // a mark from the future (a clock moved back) isn't trusted
  return at > 0 && at <= now && now - at <= ELIGIBLE_MS;
}

export function wasPushPromptAnswered(): boolean {
  return readStorage(RECORD_KEY) !== null;
}

export function recordPushPrompt(state: PushPromptRecord): void {
  writeStorage(RECORD_KEY, state);
  removeStorage(ELIGIBLE_KEY, "session");
}

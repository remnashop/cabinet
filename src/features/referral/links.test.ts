import { describe, expect, it } from "vitest";

import type { ReferralProgram } from "@entities/referral/api";
import i18n from "@shared/i18n";

import { inviteLinks, rewardTerms } from "./links";

describe("inviteLinks", () => {
  it("builds the bot and cabinet links", () => {
    expect(inviteLinks("IVAN42", "shop_bot", "https://c.example")).toEqual({
      bot: "https://t.me/shop_bot?start=ref_IVAN42",
      cabinet: "https://c.example/?ref=IVAN42",
    });
  });

  it("has no bot link without a bot username", () => {
    expect(inviteLinks("IVAN42", null, "https://c.example").bot).toBeNull();
  });

  it("has no links without a code", () => {
    expect(inviteLinks(null, "shop_bot", "https://c.example")).toEqual({ bot: null, cabinet: null });
  });
});

describe("rewardTerms", () => {
  const program: ReferralProgram = {
    enabled: true,
    reward_type: "POINTS",
    reward_strategy: "PERCENT",
    reward_amounts: { "1": "10.00", "2": "5.00" },
    invitee_reward_type: "EXTRA_DAYS",
    invitee_reward_amount: 0,
    accrual_strategy: "EVERY_PAYMENT",
    max_level: 2,
  };

  it("reads the level it is asked for", () => {
    const t = i18n.getFixedT("en");
    expect(rewardTerms(program, t, "en")).toBe("10% of a friend's payment as points");
    expect(rewardTerms(program, t, "en", 2)).toBe("5% of a friend's payment as points");
    expect(rewardTerms(program, t, "en", 3)).toBe("");
  });
});

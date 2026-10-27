import { beforeAll, describe, expect, it } from "vitest";

import i18n from "@shared/i18n";
import type { PromocodeActivation } from "@entities/plan/api";

import { rewardText } from "./reward-text";

const act = (reward_type: PromocodeActivation["reward_type"], reward: number | null, days: number | null = null) =>
  ({ code: "X", reward_type, reward, reward_duration_days: days, reward_plan_id: null, reward_addon_id: null }) as PromocodeActivation;

describe("rewardText", () => {
  beforeAll(() => i18n.changeLanguage("ru"));

  it.each([
    [act("DURATION", 2), "+2 дня к подписке"],
    [act("TRAFFIC", 5), "+5 ГБ трафика"],
    [act("DEVICES", 3), "+3 устройства"],
    [act("SUBSCRIPTION", null, 30), "Подписка на 30 дней активирована"],
    [act("PERSONAL_DISCOUNT", 10), "Постоянная скидка 10%"],
    [act("PURCHASE_DISCOUNT", 10), "Скидка 10% на следующую покупку"],
    [act("DURATION", null), "Промокод активирован"],
  ])("%j", (a, text) => {
    expect(rewardText(a)).toBe(text);
  });
});

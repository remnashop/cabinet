import { beforeAll, describe, expect, it } from "vitest";

import i18n from "@shared/i18n";
import type { PromocodeActivation } from "@entities/plan/api";

import { rewardText } from "./reward-text";

const act = (reward_type: PromocodeActivation["reward_type"], reward: number | null, days: number | null = null) =>
  ({ code: "X", reward_type, reward, reward_duration_days: days, reward_plan_id: null, reward_addon_id: null }) as PromocodeActivation;

describe("rewardText", () => {
  beforeAll(() => i18n.changeLanguage("ru"));

  it.each([
    [act("DURATION", 2), "Подписка продлена на 2 дня"],
    [act("TRAFFIC", 5), "К подписке добавлено 5 ГБ трафика"],
    [act("DEVICES", 3), "Можно подключить ещё 3 устройства"],
    [act("SUBSCRIPTION", null, 30), "Вам выдана подписка на 30 дней"],
    [act("SUBSCRIPTION", null, 0), "Вам выдана бессрочная подписка"],
    [act("PERSONAL_DISCOUNT", 10), "Ваша постоянная скидка теперь 10%"],
    [act("PURCHASE_DISCOUNT", 10), "Скидка 10% применится к следующей покупке"],
    [act("DURATION", null), null],
  ])("%j", (a, text) => {
    expect(rewardText(a)).toBe(text);
  });
});

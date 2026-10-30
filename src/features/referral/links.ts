import type { TFunction } from "i18next";

import type { ReferralProgram } from "@entities/referral/api";
import { formatNumber } from "@shared/lib/format";

/** null links: no code yet, or (bot only) the bot isn't configured. */
export function inviteLinks(code: string | null, botUsername: string | null, origin: string) {
  if (!code) return { bot: null, cabinet: null };
  return {
    bot: botUsername ? `https://t.me/${botUsername}?start=ref_${code}` : null,
    cabinet: `${origin}/?ref=${encodeURIComponent(code)}`,
  };
}

/** The program's terms for a referral of this level, e.g. "10% от оплаты друга баллами". */
export function rewardTerms(program: ReferralProgram, t: TFunction, locale: string, level = 1): string {
  const amount = program.reward_amounts[String(level)];
  if (amount === undefined) return "";
  const count = Number(amount);
  const n = formatNumber(amount, locale);
  return t(`referral.terms.${program.reward_strategy}_${program.reward_type}`, { count, n });
}

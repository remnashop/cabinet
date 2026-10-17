import type { TFunction } from "i18next";

import type { ReferralProgram } from "@entities/referral/api";

/** null links: no code yet, or (bot only) the bot isn't configured. */
export function inviteLinks(code: string | null, botUsername: string | null, origin: string) {
  if (!code) return { bot: null, cabinet: null };
  return {
    bot: botUsername ? `https://t.me/${botUsername}?start=ref_${code}` : null,
    cabinet: `${origin}/?ref=${encodeURIComponent(code)}`,
  };
}

/** Points are a Decimal string ("240.00"): show 240, keep real fractions. */
export function formatNumber(value: string | number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(value));
}

/** The program's terms for a level-1 referral, e.g. "10% от оплаты друга баллами". */
export function rewardTerms(program: ReferralProgram, t: TFunction, locale: string): string {
  const amount = program.reward_amounts["1"];
  if (amount === undefined) return "";
  const count = Number(amount);
  const n = formatNumber(amount, locale);
  return t(`referral.terms.${program.reward_strategy}_${program.reward_type}`, { count, n });
}

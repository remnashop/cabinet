import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { apiGet, apiPatch } from "@shared/api/http";
import type { SupportedLanguage } from "@shared/i18n";

export interface Me {
  id: number;
  name: string;
  email: string | null;
  telegram_id: number | null;
  username: string | null;
  language: string;
  created_at: string | null;
  // Decimal string, e.g. "120.00"
  points: string;
  bonus_days: number;
  // percents; 0 = none
  personal_discount: number;
  purchase_discount: number;
  loyalty_discount: number;
}

/** The biggest of the user's three discounts, percent; 0 = none. */
export function maxDiscount(me: Me): number {
  return Math.max(me.personal_discount, me.purchase_discount, me.loyalty_discount);
}

export function useMeQuery() {
  return useQuery({ queryKey: ["me"], queryFn: ({ signal }) => apiGet<Me>("/users/me", signal) });
}

/** Saves the language on the server (bot and email texts follow it), then switches the UI. */
export function useChangeLanguage(onDone?: () => void) {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (language: SupportedLanguage) => apiPatch("/users/me", { language }),
    onSuccess: async (_, language) => {
      await i18n.changeLanguage(language);
      // the answer carries raw discounts: refetch instead of caching it
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      onDone?.();
    },
  });
}

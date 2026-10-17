import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@shared/api/http";

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

export function useMeQuery() {
  return useQuery({ queryKey: ["me"], queryFn: ({ signal }) => apiGet<Me>("/users/me", signal) });
}

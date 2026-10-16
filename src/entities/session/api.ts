import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@shared/api/http";

export interface Me {
  id: number;
  name: string;
  email: string | null;
  telegram_id: number | null;
  username: string | null;
  language: string;
}

export function useMeQuery() {
  return useQuery({ queryKey: ["me"], queryFn: ({ signal }) => apiGet<Me>("/users/me", signal) });
}

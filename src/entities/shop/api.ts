import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@shared/api/http";

export interface CabinetSettings {
  max_active_subscriptions: number | null;
  device_single_reset_enabled: boolean;
  device_all_reset_enabled: boolean;
  link_reset_enabled: boolean;
  bot_username: string | null;
}

export function useCabinetSettingsQuery() {
  return useQuery({
    queryKey: ["cabinet-settings"],
    queryFn: ({ signal }) => apiGet<CabinetSettings>("/shop/public-settings", signal),
  });
}

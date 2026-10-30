import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@shared/api/http";

export interface CabinetSettings {
  max_active_subscriptions: number | null;
  device_single_reset_enabled: boolean;
  device_all_reset_enabled: boolean;
  device_all_reset_cooldown_hours: number;
  link_reset_enabled: boolean;
  bot_username: string | null;
  // where support is: a Telegram username without "@", an https page; null = not set
  support_telegram: string | null;
  support_url: string | null;
}

export function useCabinetSettingsQuery() {
  return useQuery({
    queryKey: ["cabinet-settings"],
    queryFn: ({ signal }) => apiGet<CabinetSettings>("/shop/public-settings", signal),
  });
}

/** The shop's support contacts, each null when not set; both null: there is no support to show. */
export function useSupportLinks(): { telegram: string | null; web: string | null } {
  const settings = useCabinetSettingsQuery();
  const username = settings.data?.support_telegram ?? null;
  return { telegram: username ? `https://t.me/${username}` : null, web: settings.data?.support_url ?? null };
}

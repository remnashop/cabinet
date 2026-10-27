import { House, ShoppingCart, User, Users } from "lucide-react";

import { useReferralQuery } from "@entities/referral/api";

export const NAV_ITEMS = [
  { key: "subscription", to: "/", end: true, icon: House },
  { key: "purchase", to: "/purchase", end: false, icon: ShoppingCart },
  { key: "referral", to: "/referral", end: false, icon: Users },
  { key: "profile", to: "/profile", end: false, icon: User },
] as const;

/** The referral tab shows only once the program is known to run: switched off in the panel, it is gone. */
export function useNavItems() {
  const enabled = useReferralQuery().data?.program.enabled;
  return NAV_ITEMS.filter((item) => item.key !== "referral" || enabled);
}

import { ShieldCheck, ShoppingCart, User, Users } from "lucide-react";

export const NAV_ITEMS = [
  { key: "subscription", to: "/", end: true, icon: ShieldCheck },
  { key: "purchase", to: "/purchase", end: false, icon: ShoppingCart },
  { key: "referral", to: "/referral", end: false, icon: Users },
  { key: "profile", to: "/profile", end: false, icon: User },
] as const;

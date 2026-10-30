import { Mail } from "lucide-react";
import type { ReactNode } from "react";

import type { IdentityKind } from "@entities/identity/api";
import { PROVIDER_ICONS } from "@features/auth/ui/provider-icons";

export const KIND_ICON: Record<IdentityKind, ReactNode> = {
  TELEGRAM: PROVIDER_ICONS.telegram,
  EMAIL: <Mail className="size-4" />,
  GOOGLE: PROVIDER_ICONS.google,
  YANDEX: PROVIDER_ICONS.yandex,
};

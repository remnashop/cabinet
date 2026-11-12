import { useMutation } from "@tanstack/react-query";
import type { ParseKeys } from "i18next";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { useShownLegalLocale } from "@entities/legal/api";
import { startOAuth } from "@features/auth/oauth-redirect";
import { PROVIDER_ICONS } from "@features/auth/ui/provider-icons";
import { getErrorMessage } from "@shared/api/http";
import { safeNext } from "@shared/lib/safe-redirect";
import { Button } from "@shared/ui/Button";
import { FormError } from "@shared/ui/FormError";

export function OAuthButtons({ providers }: { providers: string[] }) {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const legal = useShownLegalLocale();
  const start = useMutation({
    mutationFn: (provider: string) => startOAuth(provider, safeNext(params.get("next")), legal),
  });

  // Telegram first: most customers already have it; an unknown provider has no label to show
  const sorted = providers
    .filter((provider) => i18n.exists(`auth.providers.${provider}`))
    .sort((a, b) => Number(b === "telegram") - Number(a === "telegram"));

  return (
    <div className="flex w-full flex-col gap-2">
      {sorted.map((provider) => (
        <Button
          key={provider}
          variant="glass"
          className="w-full"
          disabled={start.isPending}
          onClick={() => start.mutate(provider)}
        >
          {PROVIDER_ICONS[provider]}
          {t("auth.continueWith", { provider: t(`auth.providers.${provider}` as ParseKeys) })}
        </Button>
      ))}
      {start.isError && <FormError>{getErrorMessage(start.error, t("errors.generic"))}</FormError>}
    </div>
  );
}

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import type { AuthMethods } from "@features/auth/api";
import { startOAuth } from "@features/auth/oauth-redirect";
import { getErrorMessage } from "@shared/api/http";
import { safeNext } from "@shared/lib/safe-redirect";
import { Button } from "@shared/ui/Button";

export function OAuthButtons({ providers }: { providers: AuthMethods["oauth"] }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const start = useMutation({ mutationFn: (provider: string) => startOAuth(provider, safeNext(params.get("next"))) });

  // Telegram first: most customers already have it
  const sorted = [...providers].sort((a, b) => Number(b.provider === "telegram") - Number(a.provider === "telegram"));

  return (
    <div className="flex w-full flex-col gap-2">
      {sorted.map(({ provider, name }) => (
        <Button
          key={provider}
          variant={provider === "telegram" ? "solid" : "outline"}
          className="w-full"
          disabled={start.isPending}
          onClick={() => start.mutate(provider)}
        >
          {provider === "telegram" ? t("auth.telegram") : t("auth.continueWith", { provider: name })}
        </Button>
      ))}
      {start.isError && <p className="text-sm text-error">{getErrorMessage(start.error, t("errors.generic"))}</p>}
    </div>
  );
}

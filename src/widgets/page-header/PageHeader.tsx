import { ChevronLeft } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { isMiniApp, useTelegramBackButton } from "@shared/telegram";

/** backTo: a nested screen; Telegram's native back button replaces ours inside a Mini App. */
export function PageHeader({ title, backTo }: { title: string; backTo?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onBack = useCallback(() => {
    if (backTo) void navigate(backTo);
  }, [backTo, navigate]);
  useTelegramBackButton(backTo ? onBack : null);

  return (
    <header className="mb-4 flex items-center gap-2">
      {backTo && !isMiniApp() && (
        <Link
          to={backTo}
          aria-label={t("common.back")}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-white/[0.06]"
        >
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}

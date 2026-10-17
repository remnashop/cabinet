import { ChevronLeft } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { isMiniApp, useTelegramBackButton } from "@shared/telegram";

const BACK_CLASS = "flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-white/[0.06]";

interface PageHeaderProps {
  title: string;
  /** a nested screen; Telegram's native back button replaces ours inside a Mini App */
  backTo?: string;
  /** in-page back (a wizard step); wins over backTo, drives Telegram's button too; keep it stable */
  onBack?: () => void;
}

export function PageHeader({ title, backTo, onBack }: PageHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useCallback(() => {
    // replace: a native back that pushed would stack /profile ↔ /profile/payments forever
    if (backTo) void navigate(backTo, { replace: true });
  }, [backTo, navigate]);
  const handler = onBack ?? (backTo ? goBack : null);
  useTelegramBackButton(handler);

  return (
    <header className="mb-4 flex items-center gap-2">
      {handler &&
        !isMiniApp() &&
        (onBack ? (
          <button type="button" onClick={onBack} aria-label={t("common.back")} className={BACK_CLASS}>
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <Link to={backTo!} aria-label={t("common.back")} className={BACK_CLASS}>
            <ChevronLeft className="size-5" />
          </Link>
        ))}
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}

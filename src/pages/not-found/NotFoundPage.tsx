import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { FullScreen } from "@widgets/full-screen/FullScreen";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <FullScreen>
      <h1 className="text-xl font-semibold">{t("pages.notFound")}</h1>
      <Link to="/" className="text-sm text-primary">
        {t("common.home")}
      </Link>
    </FullScreen>
  );
}

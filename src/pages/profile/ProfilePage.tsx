import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useMeQuery } from "@entities/session/api";
import { logout } from "@features/auth/logout";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { PageHeader } from "@widgets/page-header/PageHeader";

export function ProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: me } = useMeQuery();

  return (
    <>
      <PageHeader title={t("pages.profile")} />
      <div className="flex flex-col gap-3">
        <Card>
          <div className="font-medium">{me?.name}</div>
          <div className="text-sm text-muted-foreground">{me?.email ?? me?.username}</div>
        </Card>
        <Link to="/profile/payments">
          <Card className="flex items-center justify-between text-sm font-medium">
            {t("pages.payments")}
            <ChevronRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>
        <Button
          variant="danger"
          className="self-start"
          onClick={() => void logout().then(() => queryClient.clear())}
        >
          {t("common.logout")}
        </Button>
      </div>
    </>
  );
}

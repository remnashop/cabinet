import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentResultPage({ success }: { success: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto mt-16 max-w-sm p-4">
      <Card className="space-y-4 text-center">
        <h1 className={`text-lg font-semibold ${success ? "text-green-600" : "text-red-600"}`}>
          {t(success ? "payment.successTitle" : "payment.failedTitle")}
        </h1>
        <p className="text-sm text-slate-500">{t(success ? "payment.success" : "payment.failed")}</p>
        <Button asChild className="w-full">
          <Link to="/">{t("payment.back")}</Link>
        </Button>
      </Card>
    </div>
  );
}

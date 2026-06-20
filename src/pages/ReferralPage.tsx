import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { referralApi } from "@/api/referral";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReferralPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["referral", "program"],
    queryFn: referralApi.program,
    retry: false,
  });
  const [copied, setCopied] = useState(false);

  if (isLoading) return <div className="p-6">…</div>;
  if (isError || !data) {
    return (
      <div className="mx-auto mt-4 max-w-md p-4">
        <Card>{t("referral.error")}</Card>
      </div>
    );
  }
  if (!data.enabled) {
    return (
      <div className="mx-auto mt-4 max-w-md p-4">
        <Card>{t("referral.disabled")}</Card>
      </div>
    );
  }

  function copy() {
    void navigator.clipboard.writeText(data!.referral_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mx-auto mt-4 max-w-md space-y-4 p-4">
      <h1 className="text-xl font-semibold">{t("referral.title")}</h1>

      <Card className="space-y-3">
        <div className="text-xs text-slate-400">{t("referral.code")}</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1 text-sm">
            {data.referral_code}
          </code>
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? t("referral.copied") : t("referral.copy")}
          </Button>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">{t("referral.invited")}</span>
          <span className="font-medium">{data.invited_count}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">{t("referral.invitedPaid")}</span>
          <span className="font-medium">{data.invited_with_payment_count}</span>
        </div>
      </Card>

      {data.reward_levels.length > 0 && (
        <Card className="space-y-2">
          <div className="text-xs text-slate-400">{t("referral.levels")}</div>
          {data.reward_levels.map((lvl) => (
            <div key={lvl.level} className="flex justify-between text-sm">
              <span className="text-slate-500">{t("referral.level", { level: lvl.level })}</span>
              <span className="font-medium">{lvl.value}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

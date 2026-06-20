import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { authApi } from "@/api/auth";
import { useSessionStore } from "@/store/session";
import { useSubscription } from "@/hooks/useSubscription";
import { daysLeft, formatBytes } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SubscriptionPage() {
  const { t } = useTranslation();
  const clear = useSessionStore((s) => s.clear);
  const { data, isLoading } = useSubscription();

  async function onLogout() {
    await authApi.logout();
    clear();
    window.location.assign("/login");
  }

  if (isLoading) return <div className="p-6">…</div>;

  return (
    <div className="mx-auto mt-8 max-w-md space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("subscription.title")}</h1>
        <Button variant="outline" size="sm" onClick={onLogout}>
          {t("subscription.logout")}
        </Button>
      </div>

      {!data ? (
        <Card>{t("subscription.none")}</Card>
      ) : (
        <Card className="space-y-3">
          <Row label={t("subscription.status")} value={data.status} />
          <Row label={t("subscription.plan")} value={data.plan_name} />
          <Row
            label={t("subscription.expires")}
            value={new Date(data.expire_at).toLocaleDateString()}
          />
          <Row label="" value={t("subscription.daysLeft", { count: daysLeft(data.expire_at) })} />
          <Row
            label={t("subscription.traffic")}
            value={
              data.traffic_limit === 0
                ? t("subscription.unlimited")
                : // traffic_limit is in GB (used_traffic_bytes is in bytes) — normalize to bytes.
                  `${formatBytes(data.used_traffic_bytes ?? 0)} / ${formatBytes(data.traffic_limit * 1024 ** 3)}`
            }
          />
          <Row label={t("subscription.devices")} value={String(data.device_limit)} />
          <div className="flex flex-col items-center gap-2 pt-2">
            <span className="text-xs text-slate-400">{t("subscription.configLink")}</span>
            <QRCodeSVG value={data.url} size={160} />
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { useDevices, useDeviceMutations } from "@/hooks/useDevices";
import type { Device } from "@/api/devices";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DevicesPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useDevices();
  const { deleteOne, deleteAll, reissue } = useDeviceMutations();

  if (isLoading) return <div className="p-6">…</div>;
  if (isError) {
    return (
      <div className="mx-auto mt-4 max-w-md p-4">
        <Card>{t("devices.error")}</Card>
      </div>
    );
  }

  const devices = data?.devices ?? [];
  const busy = deleteOne.isPending || deleteAll.isPending || reissue.isPending;

  return (
    <div className="mx-auto mt-4 max-w-md space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("devices.title")}</h1>
        {data && (
          <span className="text-sm text-slate-400">
            {t("devices.count", { current: data.current_count, max: data.max_count })}
          </span>
        )}
      </div>

      {devices.length === 0 ? (
        <Card>{t("devices.empty")}</Card>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => (
            <Card key={device.hwid} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{deviceLabel(device, t)}</div>
                <div className="truncate text-xs text-slate-400">{device.hwid}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => deleteOne.mutate(device.hwid)}
              >
                {t("devices.delete")}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        {devices.length > 0 && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (window.confirm(t("devices.confirmAll"))) deleteAll.mutate();
            }}
          >
            {t("devices.deleteAll")}
          </Button>
        )}
        <Button
          disabled={busy}
          onClick={() => {
            if (window.confirm(t("devices.confirmReissue"))) reissue.mutate();
          }}
        >
          {t("devices.reissue")}
        </Button>
      </div>
    </div>
  );
}

function deviceLabel(device: Device, t: (key: string) => string): string {
  return device.device_model || device.platform || t("devices.unknown");
}

import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useCabinetSettingsQuery } from "@entities/shop/api";
import {
  useDeleteAllDevices,
  useDeleteDevice,
  useDevicesQuery,
  type OwnSubscription,
} from "@entities/subscription/api";
import { getErrorMessage } from "@shared/api/http";
import { formatDate } from "@shared/lib/format";
import { Card } from "@shared/ui/Card";
import { ConfirmSheet } from "@shared/ui/ConfirmSheet";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { Skeleton } from "@shared/ui/Skeleton";

type Confirm = { kind: "one"; hwid: string; name: string } | { kind: "all" } | null;

/** Devices connected to one subscription, with removal when the shop allows it. */
export function DevicesCard({ subscription }: { subscription: OwnSubscription }) {
  const { t, i18n } = useTranslation();
  const devices = useDevicesQuery(subscription.id);
  const settings = useCabinetSettingsQuery();
  const deleteOne = useDeleteDevice();
  const deleteAll = useDeleteAllDevices();
  const [confirm, setConfirm] = useState<Confirm>(null);

  if (devices.isPending) return <Skeleton className="h-28" />;
  if (devices.isError) return <ErrorCard onRetry={() => void devices.refetch()} />;

  const items = devices.data.items;
  const limit = subscription.effective_device_limit === 0 ? "∞" : String(subscription.effective_device_limit);
  const failed = [deleteOne, deleteAll].find((m) => m.isError);

  const ask = (next: Confirm) => {
    deleteOne.reset();
    deleteAll.reset();
    setConfirm(next);
  };
  // the sheet closes either way; a failure shows in the card, under the list
  const close = () => setConfirm(null);
  const onConfirm = () => {
    if (confirm?.kind === "one")
      deleteOne.mutate({ subscriptionId: subscription.id, hwid: confirm.hwid }, { onSettled: close });
    else deleteAll.mutate({ subscriptionId: subscription.id }, { onSettled: close });
  };

  return (
    <Card variant="list">
      <div className="flex items-center justify-between px-2.5 pb-1 pt-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
          {t("home.devicesTitle", { used: items.length, limit })}
        </h3>
        {settings.data?.device_all_reset_enabled && items.length > 0 && (
          <button
            type="button"
            onClick={() => ask({ kind: "all" })}
            className="text-[11.5px] text-muted-foreground transition-colors hover:text-error"
          >
            {t("home.deleteAll")}
          </button>
        )}
      </div>

      {items.length === 0 && <p className="px-2.5 py-2 text-[12.5px] text-muted-foreground">{t("home.noDevices")}</p>}
      {items.map((device) => {
        const name = device.device_model || device.platform || device.hwid;
        return (
          <div
            key={device.hwid}
            className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 hover:bg-white/[0.04]"
          >
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{name}</div>
              <div className="truncate text-[11.5px] text-muted-foreground">
                {[device.platform, t("home.connectedAt", { date: formatDate(device.created_at, i18n.language) })]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            {settings.data?.device_single_reset_enabled && (
              <button
                type="button"
                aria-label={t("home.deleteDevice")}
                onClick={() => ask({ kind: "one", hwid: device.hwid, name })}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-error"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        );
      })}

      {failed && (
        <p className="px-2.5 py-2 text-[12.5px] text-error">{getErrorMessage(failed.error, t("errors.generic"))}</p>
      )}

      <ConfirmSheet
        open={confirm !== null}
        title={confirm?.kind === "all" ? t("home.deleteAllTitle") : t("home.deleteDeviceTitle")}
        text={confirm?.kind === "one" ? t("home.deleteDeviceText", { name: confirm.name }) : t("home.deleteAllText")}
        confirmLabel={t("home.delete")}
        danger
        pending={deleteOne.isPending || deleteAll.isPending}
        onConfirm={onConfirm}
        onClose={close}
      />
    </Card>
  );
}

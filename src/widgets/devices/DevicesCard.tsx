import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useCabinetSettingsQuery } from "@entities/shop/api";
import {
  useDeleteAllDevices,
  useDeleteDevice,
  useDevicesQuery,
  type OwnSubscription,
} from "@entities/subscription/api";
import { getErrorMessage } from "@shared/api/http";
import { formatDate, formatDateTime } from "@shared/lib/format";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ConfirmSheet } from "@shared/ui/ConfirmSheet";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EVENT_ROW, EventIcon, EventList, EventRow } from "@shared/ui/EventList";
import { AndroidIcon, AppleIcon, DevicesIcon, LinuxIcon, TvIcon, WindowsIcon } from "@shared/ui/PlatformIcons";
import { Skeleton } from "@shared/ui/Skeleton";
import { FormError } from "@shared/ui/FormError";
import { Ripple } from "@shared/ui/Ripple";

function DeleteMark() {
  const { t } = useTranslation();
  return (
    <span className="flex size-8 items-center justify-center rounded-full font-normal text-muted-foreground transition-colors group-hover:bg-error/10 group-hover:text-error">
      <Trash2 className="size-3.5" />
      {/* the button keeps the device's name and adds what it does */}
      <span className="sr-only">{t("home.deleteDevice")}</span>
    </span>
  );
}

// the platform is what the client reports, so matched loosely
function deviceIcon({ platform, device_model }: { platform: string | null; device_model: string | null }) {
  const text = `${platform ?? ""} ${device_model ?? ""}`;
  if (/\btv\b/i.test(text)) return TvIcon;
  if (/ios|ipad|iphone|mac/i.test(text)) return AppleIcon;
  if (/android/i.test(text)) return AndroidIcon;
  if (/windows/i.test(text)) return WindowsIcon;
  if (/linux/i.test(text)) return LinuxIcon;
  return DevicesIcon;
}

type Confirm = { kind: "one"; hwid: string; name: string } | { kind: "all" } | null;

export function DevicesCard({ subscription }: { subscription: OwnSubscription }) {
  const { t, i18n } = useTranslation();
  const devices = useDevicesQuery(subscription.id);
  const settings = useCabinetSettingsQuery();
  const deleteOne = useDeleteDevice();
  const deleteAll = useDeleteAllDevices();
  const [confirm, setConfirm] = useState<Confirm>(null);
  // the cooldown is checked against the mount time, the button wakes once the card mounts again
  const [now] = useState(Date.now);

  if (devices.isPending) return <Skeleton round className="h-28" />;
  if (devices.isError && !devices.data) return <ErrorCard round error={devices.error} onRetry={() => void devices.refetch()} />;

  const items = devices.data.items;
  const maxDevices = subscription.effective_device_limit;
  // the free places under the limit, as one empty row; an unlimited plan shows it only while there's no device yet
  const freeSlots = maxDevices === 0 ? 0 : Math.max(0, maxDevices - items.length);
  const addLabel =
    maxDevices === 0
      ? items.length === 0 && t("home.connectDevice")
      : freeSlots > 0 && t(items.length === 0 ? "home.freeSlotFirst" : "home.freeSlot", { count: freeSlots });
  const failed = [deleteOne, deleteAll].find((m) => m.isError);
  // the shop's cooldown after the last "delete all"
  const cooldownMs = (settings.data?.device_all_reset_cooldown_hours ?? 0) * 3_600_000;
  const resetAt = subscription.device_all_reset_at && Date.parse(subscription.device_all_reset_at) + cooldownMs;
  const resetFrom = resetAt && resetAt > now ? new Date(resetAt).toISOString() : null;

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

  const canDelete = settings.data?.device_single_reset_enabled;

  return (
    <Card round>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {maxDevices === 0
            ? t("home.devicesTitleUnlimited", { used: items.length })
            : t("home.devicesTitle", { used: items.length, limit: maxDevices })}
        </h3>
        {settings.data?.device_all_reset_enabled && items.length > 1 && (
          <Button variant="glass" disabled={!!resetFrom} onClick={() => ask({ kind: "all" })}>
            {resetFrom ? t("home.deleteAllFrom", { time: formatDateTime(resetFrom, i18n.language) }) : t("home.deleteAll")}
          </Button>
        )}
      </div>

      <EventList className="mt-2">
        {items.map((device) => {
          const Icon = deviceIcon(device);
          const name = device.device_model || device.platform || device.hwid;
          return (
            <EventRow
              key={device.hwid}
              icon={<EventIcon glyph={<Icon className="size-4" strokeWidth={1.6} />} />}
              title={name}
              caption={
                <>
                  {device.platform}
                  {device.platform && " · "}
                  {formatDate(device.created_at, i18n.language)}
                </>
              }
              // the whole row asks to remove it; without removal it's a plain row
              onClick={canDelete ? () => ask({ kind: "one", hwid: device.hwid, name }) : undefined}
              aside={canDelete && <DeleteMark />}
            />
          );
        })}
        {addLabel && (
          <Link
            to={`/subscription/${subscription.id}/connect`}
            className={`group relative flex ${EVENT_ROW} items-center gap-3 text-muted-foreground hover:bg-white/[0.04] hover:text-foreground`}
          >
            <Ripple />
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 transition-colors group-hover:border-primary/45 group-hover:text-primary">
              <Plus className="size-4" />
            </span>
            <span className="text-sm">{addLabel}</span>
          </Link>
        )}
      </EventList>

      {failed && <FormError className="mt-2 px-3">{getErrorMessage(failed.error, t("errors.generic"))}</FormError>}

      <ConfirmSheet
        open={confirm !== null}
        title={confirm?.kind === "all" ? t("home.deleteAllTitle") : t("home.deleteDeviceTitle")}
        text={confirm?.kind === "one" ? t("home.deleteDeviceText", { name: confirm.name }) : t("home.deleteAllText")}
        confirmLabel={t("home.delete")}
        danger
        icon={Trash2}
        pending={deleteOne.isPending || deleteAll.isPending}
        onConfirm={onConfirm}
        onClose={close}
      />
    </Card>
  );
}

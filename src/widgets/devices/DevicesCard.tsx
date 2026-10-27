import { Plus, Smartphone, Trash2 } from "lucide-react";
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
import { formatDate } from "@shared/lib/format";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ConfirmSheet } from "@shared/ui/ConfirmSheet";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EVENT_ROW, EventIcon, EventList, EventListEmpty } from "@shared/ui/EventList";
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
  const maxDevices = subscription.effective_device_limit;
  const limit = maxDevices === 0 ? "∞" : String(maxDevices);
  // the free places under the limit, as one empty row; an unlimited plan has none to show
  const freeSlots = maxDevices === 0 ? 0 : Math.max(0, maxDevices - items.length);
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

  const canDelete = settings.data?.device_single_reset_enabled;
  // the panel's event log columns; date and delete fold away on a phone, the date into the second line
  const cols = canDelete
    ? "grid-cols-[minmax(0,1fr)_32px] sm:grid-cols-[minmax(0,1fr)_140px_32px]"
    : "grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_140px]";

  return (
    <Card>
      {/* pl-3: the rows' inset, so the title lines up with the icons; "delete all" sits at the card's right edge */}
      <div className="flex min-h-8 items-center justify-between gap-3 pl-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
          {t("home.devicesTitle", { used: items.length, limit })}
        </h3>
        {settings.data?.device_all_reset_enabled && items.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => ask({ kind: "all" })}>
            {t("home.deleteAll")}
          </Button>
        )}
      </div>

      {items.length === 0 && freeSlots === 0 ? (
        <EventListEmpty icon={Smartphone} text={t("home.noDevices")} />
      ) : (
        <EventList className="mt-2">
          {items.map((device) => {
            const name = device.device_model || device.platform || device.hwid;
            const date = formatDate(device.created_at, i18n.language);
            return (
              <div
                key={device.hwid}
                className={`grid ${EVENT_ROW} ${cols} items-center gap-4 hover:bg-white/[0.04]`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <EventIcon icon={Smartphone} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground/90">{name}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {device.platform}
                      <span className="sm:hidden">
                        {device.platform && " · "}
                        {date}
                      </span>
                    </span>
                  </span>
                </span>
                <span className="hidden text-[13px] tabular-nums text-foreground sm:block">{date}</span>
                {canDelete && (
                  <button
                    type="button"
                    aria-label={t("home.deleteDevice")}
                    onClick={() => ask({ kind: "one", hwid: device.hwid, name })}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
          {freeSlots > 0 && (
            <Link
              to={`/subscription/${subscription.id}/connect`}
              className={`group flex ${EVENT_ROW} items-center gap-3 text-muted-foreground hover:bg-white/[0.04] hover:text-foreground`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 transition-colors group-hover:border-primary/45 group-hover:text-primary">
                <Plus className="size-4" />
              </span>
              <span className="text-[13px]">{t("home.freeSlot", { count: freeSlots })}</span>
            </Link>
          )}
        </EventList>
      )}

      {failed && <p className="mt-2 px-3 text-[12px] text-error">{getErrorMessage(failed.error, t("errors.generic"))}</p>}

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

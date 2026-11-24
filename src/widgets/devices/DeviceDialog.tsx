import { Smartphone } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { useRenameDevice, type Device } from "@entities/subscription/api";
import { deviceTitle } from "@entities/subscription/lib";
import { getErrorMessage } from "@shared/api/http";
import { formatDate } from "@shared/lib/format";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { FormError } from "@shared/ui/FormError";
import { InfoRow } from "@shared/ui/InfoRow";
import { Input } from "@shared/ui/Input";
import { DialogFooter, Modal } from "@shared/ui/Modal";

// the shop's column holds 32
const NAME_MAX_LENGTH = 32;

/** One device: its name to edit, what the panel knows of it, and removal where the shop allows it. */
export function DeviceDialog({
  device,
  subscriptionId,
  onDelete,
  onClose,
}: {
  device: Device | null;
  subscriptionId: number;
  /** none while the shop doesn't let customers remove a device */
  onDelete?: (device: Device) => void;
  onClose: () => void;
}) {
  return (
    <Modal narrow icon={Smartphone} open={device !== null} onClose={onClose} title={device ? deviceTitle(device) : ""}>
      {/* keyed: the field starts from each device's own name */}
      {device && (
        <DeviceForm key={device.hwid} device={device} subscriptionId={subscriptionId} onDelete={onDelete} onClose={onClose} />
      )}
    </Modal>
  );
}

function DeviceForm({
  device,
  subscriptionId,
  onDelete,
  onClose,
}: {
  device: Device;
  subscriptionId: number;
  onDelete?: (device: Device) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const rename = useRenameDevice();
  const formId = useId();
  const [name, setName] = useState(device.name ?? "");
  // a backend without device names sends no such field, and has no route to save one
  const canRename = "name" in device;
  const system = [device.platform, device.os_version].filter(Boolean).join(" ");
  const rows: [string, string][] = [
    [t("home.deviceModel"), device.device_model ?? ""],
    [t("home.deviceSystem"), system],
    [t("home.deviceApp"), device.app ?? ""],
    [t("home.deviceConnected"), formatDate(device.created_at, i18n.language)],
  ];

  const save = () => {
    if (rename.isPending) return;
    const trimmed = name.trim();
    if (trimmed === (device.name ?? "")) return onClose();
    rename.mutate({ subscriptionId, hwid: device.hwid, name: trimmed }, { onSuccess: onClose });
  };

  return (
    <form
      id={formId}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      {canRename && (
        <Input
          value={name}
          placeholder={device.device_model || device.platform || t("home.deviceNamePlaceholder")}
          aria-invalid={rename.isError || undefined}
          // counted in characters, as the shop does: an emoji is one, not two UTF-16 units
          onChange={(event) => setName(Array.from(event.target.value).slice(0, NAME_MAX_LENGTH).join(""))}
        />
      )}
      {rename.isError && <FormError>{getErrorMessage(rename.error, t("errors.generic"))}</FormError>}
      <Card variant="list">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <InfoRow key={label} label={label} value={<span className="truncate">{value}</span>} />
          ))}
      </Card>
      <DialogFooter>
        {onDelete && (
          <Button variant="glassDanger" type="button" onClick={() => onDelete(device)}>
            {t("home.delete")}
          </Button>
        )}
        {canRename && (
          <Button type="submit" form={formId} variant="glassAccent" disabled={rename.isPending}>
            {t("common.save")}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

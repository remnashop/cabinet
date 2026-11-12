import { Globe, Headset, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSupportLinks } from "@entities/shop/api";
import { openExternal } from "@shared/telegram";
import { ActionTile } from "@shared/ui/ActionTile";
import { Modal } from "@shared/ui/Modal";

/** The choice of how to reach support, Telegram or the browser: opened by useSupport only when the shop set both. */
export function SupportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const links = useSupportLinks();
  const options = [
    links.telegram && { icon: Send, label: t("help.supportTelegram"), url: links.telegram },
    links.web && { icon: Globe, label: t("help.supportWeb"), url: links.web },
  ].filter((option) => !!option);
  return (
    <Modal narrow cards icon={Headset} open={open} onClose={onClose} title={t("help.support")}>
      <div className="grid grid-cols-2 gap-3">
        {options.map(({ icon, label, url }) => (
          <ActionTile
            key={url}
            round
            icon={icon}
            label={label}
            onClick={() => {
              onClose();
              openExternal(url);
            }}
          />
        ))}
      </div>
    </Modal>
  );
}

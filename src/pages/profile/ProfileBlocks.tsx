import {
  ChevronRight,
  FileText,
  Languages,
  LogOut,
  ReceiptText,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useIdentitiesQuery, type Identity, type IdentityKind } from "@entities/identity/api";
import { maxDiscount, type Me } from "@entities/session/api";
import { useAuthMethodsQuery } from "@features/auth/api";
import { formatNumber } from "@shared/lib/format";
import { isMiniApp } from "@shared/telegram";
import { ActionTile } from "@shared/ui/ActionTile";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { EventIcon, EventList, EventRow } from "@shared/ui/EventList";
import { FormError } from "@shared/ui/FormError";
import { Skeleton } from "@shared/ui/Skeleton";

import { KIND_ICON } from "./identity-icons";
import { rowAction, visibleIdentities, type RowAction } from "./identity-rows";

export interface ProfileActions {
  onConnect: (kind: IdentityKind) => void;
  onUnlink: (identity: Identity) => void;
  /** the Mini App's Telegram: a warning that it unlinks in a browser only */
  onUnlinkInBrowser: () => void;
  onPayments: () => void;
  /** the legal documents, as the menu's "Information"; none published, no tile */
  onDocuments?: () => void;
  onRedeemDays: () => void;
  /** the promocode dialog: a code is how a discount is got */
  onPromo: () => void;
  /** the support dialog, points are exchanged there; undefined without a support contact */
  onWithdraw?: () => void;
  onLanguage: () => void;
  onSignOut: () => void;
  languageName: string;
}

function useIdentityRows() {
  const identities = useIdentitiesQuery();
  const methods = useAuthMethodsQuery();
  const retry = () => {
    void identities.refetch();
    void methods.refetch();
  };
  if ((identities.isError && !identities.data) || (methods.isError && !methods.data)) return { state: "error" as const, error: identities.error ?? methods.error, retry };
  if (!identities.data || !methods.data) return { state: "loading" as const, retry };
  const visible = visibleIdentities(identities.data, methods.data);
  const onlyLinked = identities.data.filter((identity) => identity.linked).length === 1;
  const rows = visible.map((identity) => ({ identity, action: rowAction(identity, isMiniApp(), onlyLinked) }));
  return { state: "ready" as const, rows, retry };
}

function IdentityAction({
  identity,
  action,
  onConnect,
}: {
  identity: Identity;
  action: RowAction;
  onConnect: (kind: IdentityKind) => void;
}) {
  const { t } = useTranslation();
  // the Mini App's Telegram opens its warning, so it reads as a row that does something too
  if (identity.linked) {
    return action === "unlink" || action === "unlinkInBrowser" ? (
      <ChevronRight className="size-4 text-muted-foreground" />
    ) : null;
  }
  if (action === "connect") {
    return (
      <Button variant="secondary" onClick={() => onConnect(identity.kind)}>
        {t("profile.connect")}
      </Button>
    );
  }
  if (action === "connectInBrowser") {
    return <span className="text-right text-[12px] text-muted-foreground">{t("profile.connectInBrowser")}</span>;
  }
  return null;
}

function IdentityRows({ actions }: { actions: ProfileActions }) {
  const { t } = useTranslation();
  const data = useIdentityRows();
  if (data.state === "error") return <ErrorCard round error={data.error} onRetry={data.retry} />;
  if (data.state === "loading") return <Skeleton round className="h-40" />;
  return (
    <>
      {data.rows.map(({ identity, action }) => (
        <EventRow
          key={identity.kind}
          icon={<EventIcon glyph={KIND_ICON[identity.kind]} />}
          title={t(`profile.kinds.${identity.kind}`)}
          caption={identity.linked ? identity.label : t("profile.notLinked")}
          aside={<IdentityAction identity={identity} action={action} onConnect={actions.onConnect} />}
          onClick={
            action === "unlink"
              ? () => actions.onUnlink(identity)
              : action === "unlinkInBrowser"
                ? actions.onUnlinkInBrowser
                : undefined
          }
        />
      ))}
    </>
  );
}

/** linkError: a sign-in method's link or unlink that failed, said under their list */
export function ProfileBlocks({ me, actions, linkError }: { me: Me; actions: ProfileActions; linkError: string | null }) {
  const { t, i18n } = useTranslation();
  // the biggest of the three discounts; none shows a dash, not a missing tile
  const discount = maxDiscount(me);
  return (
    <>
      <div className={`grid gap-3 ${Number(me.points) > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
        {Number(me.points) > 0 && (
          <ActionTile
            round
            value={<span className="text-primary">{formatNumber(me.points, i18n.language)}</span>}
            label={t("profile.pointsCount", { count: Number(me.points) })}
            // withdrawing goes through support: with a whole point to withdraw and somewhere to ask
            onClick={Number(me.points) >= 1 ? actions.onWithdraw : undefined}
          />
        )}
        <ActionTile
          round
          value={<span className="text-primary">{me.bonus_days}</span>}
          label={t("profile.bonusDaysCount", { count: me.bonus_days })}
          onClick={actions.onRedeemDays}
          disabled={me.bonus_days === 0}
        />
        <ActionTile
          round
          value={discount > 0 ? <span className="text-primary">{discount}%</span> : "—"}
          label={t("home.discount")}
          onClick={actions.onPromo}
        />
      </div>
      <div className={`grid gap-3 ${actions.onDocuments ? "grid-cols-3" : "grid-cols-2"}`}>
        <ActionTile round icon={ReceiptText} label={t("profile.paymentsShort")} onClick={actions.onPayments} />
        {actions.onDocuments && (
          <ActionTile round icon={FileText} label={t("help.documents")} onClick={actions.onDocuments} />
        )}
        <ActionTile round icon={Languages} label={actions.languageName} onClick={actions.onLanguage} />
      </div>
      <div className="flex flex-col gap-2">
        <Card round>
          <EventList>
            <IdentityRows actions={actions} />
          </EventList>
        </Card>
        {linkError && <FormError className="px-[13px]">{linkError}</FormError>}
      </div>
      {/* the Mini App signs back in with Telegram's data at once: no sign-out there */}
      {!isMiniApp() && (
        <Button variant="danger" size="lg" className="lg:hidden" onClick={actions.onSignOut}>
          <LogOut className="size-5" />
          {t("common.logout")}
        </Button>
      )}
    </>
  );
}

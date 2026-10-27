import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { unlinkIdentity, useIdentitiesQuery, type Identity, type IdentityKind } from "@entities/identity/api";
import { useChangeLanguage, useMeQuery, type Me } from "@entities/session/api";
import { authApi } from "@features/auth/api";
import { MergeSheet } from "@features/link-identity/MergeSheet";
import { startOAuthLink } from "@features/link-identity/api";
import { LinkEmailSheet } from "@features/link-identity/LinkEmailSheet";
import { LinkTelegramSheet } from "@features/link-identity/LinkTelegramSheet";
import { useLinkResult } from "@features/link-identity/useLinkResult";
import { formatNumber } from "@features/referral/links";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@shared/i18n";
import { getErrorMessage } from "@shared/api/http";
import { haptic, isMiniApp } from "@shared/telegram";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { ConfirmSheet } from "@shared/ui/ConfirmSheet";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { InfoRow } from "@shared/ui/InfoRow";
import { Skeleton } from "@shared/ui/Skeleton";
import { useSignOut } from "@widgets/app-shell/sign-out";
import { PageHeader } from "@widgets/page-header/PageHeader";
import { PromoDialog } from "@widgets/promo/PromoDialog";

import { rowAction, visibleIdentities } from "./identity-rows";

function Header({ me }: { me: Me }) {
  const { t, i18n } = useTranslation();
  const since =
    me.created_at &&
    new Intl.DateTimeFormat(i18n.language, { month: "2-digit", year: "numeric" }).format(new Date(me.created_at));
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-glass-border bg-white/[0.05] text-lg font-bold text-foreground">
        {(me.name.trim()[0] ?? "?").toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold">{me.name}</div>
        <div className="text-[12px] text-muted-foreground">
          {t("profile.id", { id: me.id })}
          {since && ` · ${t("profile.since", { date: since })}`}
        </div>
      </div>
    </div>
  );
}

function BalanceCard({ me }: { me: Me }) {
  const { t, i18n } = useTranslation();
  const discounts = [
    ["personalDiscount", me.personal_discount],
    ["purchaseDiscount", me.purchase_discount],
    ["loyaltyDiscount", me.loyalty_discount],
  ] as const;
  return (
    <Card variant="list" title={t("profile.balance")}>
      <InfoRow label={t("profile.points")} value={formatNumber(me.points, i18n.language)} />
      <InfoRow label={t("profile.bonusDays")} value={me.bonus_days} />
      {discounts
        .filter(([, percent]) => percent > 0)
        .map(([key, percent]) => (
          <InfoRow key={key} label={t(`profile.${key}`)} value={<span className="text-success">−{percent}%</span>} />
        ))}
    </Card>
  );
}

/** Rows for the enabled sign-in methods. Linking (onConnect) and unlinking (onUnlink) are wired by later tasks. */
function IdentitiesCard({
  onConnect,
  onUnlink,
}: {
  onConnect: (kind: IdentityKind) => void;
  onUnlink: (identity: Identity) => void;
}) {
  const { t } = useTranslation();
  const identities = useIdentitiesQuery();
  const methods = useQuery({ queryKey: ["auth-methods"], queryFn: authApi.methods });

  if (identities.isError || methods.isError) {
    return (
      <ErrorCard
        onRetry={() => {
          void identities.refetch();
          void methods.refetch();
        }}
      />
    );
  }
  if (!identities.data || !methods.data) return <Skeleton className="h-40" />;

  const rows = visibleIdentities(identities.data, methods.data).map((identity) => ({
    identity,
    action: rowAction(identity, isMiniApp()),
  }));
  return (
    <Card variant="list" title={t("profile.signIn")}>
      {rows.map(({ identity, action }) => (
        <InfoRow
          key={identity.kind}
          label={t(`profile.kinds.${identity.kind}`)}
          onClick={action === "unlink" ? () => onUnlink(identity) : undefined}
          value={
            identity.linked ? (
              <>
                <span className="max-w-40 truncate rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                  {identity.label}
                </span>
                {/* the row is a button: say so */}
                {action === "unlink" && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
              </>
            ) : action === "connectInBrowser" ? (
              <span className="truncate text-[11px] font-normal text-muted-foreground">
                {t("profile.connectInBrowser")}
              </span>
            ) : action === "connect" ? (
              <button
                type="button"
                onClick={() => {
                  haptic();
                  onConnect(identity.kind);
                }}
                className="rounded-full bg-accent px-2.5 py-1 text-[10.5px] font-semibold text-primary"
              >
                {t("profile.connect")}
              </button>
            ) : null
          }
        />
      ))}
      {rows.some((row) => row.action === "unlinkInBrowser") && (
        <p className="px-2.5 pb-1.5 pt-0.5 text-[11px] text-muted-foreground">{t("profile.unlinkTelegramInBrowser")}</p>
      )}
    </Card>
  );
}

function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const change = useChangeLanguage(onClose);
  return (
    <BottomSheet open={open} onClose={onClose} title={t("profile.languageTitle")}>
      <div className="flex flex-col gap-2">
        {SUPPORTED_LANGUAGES.map((language) => (
          <Button
            key={language}
            variant={i18n.language === language ? "solid" : "outline"}
            disabled={change.isPending}
            onClick={() => (i18n.language === language ? onClose() : change.mutate(language))}
          >
            {LANGUAGE_NAMES[language]}
          </Button>
        ))}
        {change.isError && <p className="text-sm text-error">{getErrorMessage(change.error, t("errors.generic"))}</p>}
      </div>
    </BottomSheet>
  );
}

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const me = useMeQuery();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [linkSheet, setLinkSheet] = useState<"email" | "telegram" | null>(null);
  const link = useLinkResult();
  const oauthLink = useMutation({ mutationFn: startOAuthLink });
  const [unlinking, setUnlinking] = useState<Identity | null>(null);
  // keep the title while the sheet slides out
  const [unlinkTitleKind, setUnlinkTitleKind] = useState<IdentityKind | null>(null);
  if (unlinking && unlinking.kind !== unlinkTitleKind) setUnlinkTitleKind(unlinking.kind);
  // errors that outlive their sheet: an expired merge offer, the last sign-in method
  const [pageError, setPageError] = useState<string | null>(null);
  const unlink = useMutation({
    mutationFn: (kind: IdentityKind) => unlinkIdentity(kind),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["identities"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]),
    onError: (err) => setPageError(getErrorMessage(err, t("errors.generic"))),
    onSettled: () => setUnlinking(null),
  });

  const onConnect = (kind: IdentityKind) => {
    if (kind === "EMAIL") setLinkSheet("email");
    else if (kind === "TELEGRAM") setLinkSheet("telegram");
    else oauthLink.mutate(kind.toLowerCase());
  };

  const header = <PageHeader title={t("pages.profile")} />;
  if (me.isError) {
    return (
      <>
        {header}
        <ErrorCard onRetry={() => void me.refetch()} />
      </>
    );
  }
  if (!me.data) {
    return (
      <>
        {header}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-32" />
          <Skeleton className="h-40" />
        </div>
      </>
    );
  }

  const arrow = <ChevronRight className="size-4 text-muted-foreground" />;
  return (
    <>
      {header}
      <div className="flex flex-col gap-4">
        <Header me={me.data} />
        <BalanceCard me={me.data} />
        {link.notice && (
          <p role="status" className="px-1 text-sm text-success">
            {t(link.notice === "linked" ? "link.linked" : link.notice === "merged" ? "link.merged" : "link.alreadyLinked")}
          </p>
        )}
        {oauthLink.isError && (
          <p className="px-1 text-sm text-error">{getErrorMessage(oauthLink.error, t("errors.generic"))}</p>
        )}
        {pageError && <p className="px-1 text-sm text-error">{pageError}</p>}
        <IdentitiesCard
          onConnect={onConnect}
          onUnlink={(identity) => {
            setPageError(null);
            setUnlinking(identity);
          }}
        />
        <Card variant="list" title={t("profile.account")}>
          <InfoRow label={t("pages.payments")} value={arrow} onClick={() => void navigate("/profile/payments")} />
          <InfoRow label={t("profile.promo")} value={arrow} onClick={() => setPromoOpen(true)} />
          <InfoRow
            label={t("profile.language")}
            value={
              <>
                {LANGUAGE_NAMES[i18n.language as SupportedLanguage] ?? i18n.language}
                {arrow}
              </>
            }
            onClick={() => setLanguageOpen(true)}
          />
        </Card>
        <Button variant="danger" className="w-full lg:hidden" onClick={signOut}>
          {t("common.logout")}
        </Button>
      </div>
      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} />
      <PromoDialog open={promoOpen} onClose={() => setPromoOpen(false)} />
      <LinkEmailSheet
        open={linkSheet === "email"}
        onClose={() => setLinkSheet(null)}
        onResult={(result) => {
          setPageError(null);
          link.handleLinkResult(result);
        }}
      />
      <LinkTelegramSheet open={linkSheet === "telegram"} onClose={() => setLinkSheet(null)} />
      <MergeSheet
        offer={link.merge}
        onClose={link.closeMerge}
        onMerged={() => {
          setPageError(null);
          link.finishMerge();
        }}
        onExpired={(message) => {
          setPageError(message);
          link.closeMerge();
        }}
      />
      <ConfirmSheet
        open={unlinking !== null}
        title={t("profile.unlinkTitle", { kind: unlinkTitleKind ? t(`profile.kinds.${unlinkTitleKind}`) : "" })}
        text={t("profile.unlinkText")}
        confirmLabel={t("profile.unlink")}
        danger
        pending={unlink.isPending}
        onConfirm={() => unlinking && unlink.mutate(unlinking.kind)}
        onClose={() => setUnlinking(null)}
      />
    </>
  );
}

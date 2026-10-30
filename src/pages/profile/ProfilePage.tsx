import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CircleCheck, Copy, ExternalLink, Languages, Link2Off, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { unlinkIdentity, type Identity, type IdentityKind } from "@entities/identity/api";
import { useHasLegalDocuments } from "@entities/legal/api";
import { useChangeLanguage, useMeQuery, type Me } from "@entities/session/api";
import { MergeSheet } from "@features/link-identity/MergeSheet";
import { startOAuthLink } from "@features/link-identity/api";
import { LinkEmailSheet } from "@features/link-identity/LinkEmailSheet";
import { LinkTelegramSheet } from "@features/link-identity/LinkTelegramSheet";
import { useLinkResult } from "@features/link-identity/useLinkResult";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@shared/i18n";
import { getErrorMessage } from "@shared/api/http";
import { openExternal } from "@shared/telegram";
import { Avatar } from "@shared/ui/Avatar";
import { BottomSheet } from "@shared/ui/BottomSheet";
import { Button } from "@shared/ui/Button";
import { ICON_BUTTON_CLASS } from "@shared/ui/button-class";
import { ConfirmSheet } from "@shared/ui/ConfirmSheet";
import { ErrorCard } from "@shared/ui/ErrorCard";
import { OptionRow } from "@shared/ui/OptionRow";
import { RippleButton } from "@shared/ui/RippleButton";
import { Skeleton } from "@shared/ui/Skeleton";
import { SuccessMessage } from "@shared/ui/SuccessCheck";
import { FormError } from "@shared/ui/FormError";
import { SignOutSheet } from "@widgets/app-shell/SignOutSheet";
import { PageHeader } from "@widgets/page-header/PageHeader";
import { InfoDialog } from "@widgets/info/InfoDialog";
import { PromoDialog } from "@widgets/promo/PromoDialog";
import { useSupport } from "@widgets/support/use-support";
import { RedeemDaysSheet } from "@widgets/redeem-days/RedeemDaysSheet";
import { useCopyLink } from "@pages/connect/use-copy-link";

import { KIND_ICON } from "./identity-icons";
import { ProfileBlocks } from "./ProfileBlocks";

/**
 * Who is signed in: a pill with the avatar, the name and an ID, which the button on the right copies: the Telegram
 * one when linked, the shop's own otherwise (support finds the user by either).
 */
function Header({ me }: { me: Me }) {
  const { t } = useTranslation();
  const id = me.telegram_id ?? me.id;
  const [copied, copy] = useCopyLink(String(id));
  return (
    <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.04] py-2 pr-2 pl-2">
      <Avatar name={me.name} className="size-11 text-lg" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold">{me.name}</div>
        <div className="text-[12px] text-muted-foreground">{t("profile.id", { id })}</div>
      </div>
      <RippleButton
        type="button"
        aria-label={t("profile.copyId")}
        onClick={() => void copy()}
        className={`relative ${ICON_BUTTON_CLASS} ${
          copied ? "text-success" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {copied ? <Check className="size-[17px]" /> : <Copy className="size-[17px]" />}
      </RippleButton>
    </div>
  );
}

function LanguageRow({
  language,
  current,
  pending,
  disabled,
  onPick,
}: {
  language: SupportedLanguage;
  current: boolean;
  pending: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const { t } = useTranslation();
  const localName = t(`profile.languages.${language}`);
  return (
    <OptionRow selected={current} disabled={disabled} onClick={onPick}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[12px] font-bold text-primary">
        {language.toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-semibold">{LANGUAGE_NAMES[language]}</span>
        {localName !== LANGUAGE_NAMES[language] && (
          <span className="truncate text-[12px] text-muted-foreground">{localName}</span>
        )}
      </span>
      {pending ? (
        <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        current && <CircleCheck className="size-5 shrink-0 text-primary" />
      )}
    </OptionRow>
  );
}

function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const change = useChangeLanguage(onClose);
  return (
    <BottomSheet narrow icon={Languages} open={open} onClose={onClose} title={t("profile.languageTitle")}>
      <div className="flex flex-col gap-2">
        {SUPPORTED_LANGUAGES.map((language) => (
          <LanguageRow
            key={language}
            language={language}
            current={i18n.language === language}
            pending={change.isPending && change.variables === language}
            disabled={change.isPending}
            onPick={() => (i18n.language === language ? onClose() : change.mutate(language))}
          />
        ))}
        {change.isError && <FormError>{getErrorMessage(change.error, t("errors.generic"))}</FormError>}
      </div>
    </BottomSheet>
  );
}

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMeQuery();
  const hasDocuments = useHasLegalDocuments();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const support = useSupport();
  const [inBrowserOpen, setInBrowserOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [linkSheet, setLinkSheet] = useState<"email" | "telegram" | null>(null);
  // errors that outlive their sheet: an expired merge offer, the last sign-in method
  const [pageError, setPageError] = useState<string | null>(null);
  // a merge the backend asked for without its offer: nothing to show in the sheet, the link just failed
  const link = useLinkResult(useCallback(() => setPageError(t("link.failed")), [t]));
  const oauthLink = useMutation({ mutationFn: startOAuthLink });
  const [unlinking, setUnlinking] = useState<Identity | null>(null);
  // keep the title while the sheet slides out
  const [unlinkTitleKind, setUnlinkTitleKind] = useState<IdentityKind | null>(null);
  if (unlinking && unlinking.kind !== unlinkTitleKind) setUnlinkTitleKind(unlinking.kind);
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
    setPageError(null);
    oauthLink.reset();
    if (kind === "EMAIL") setLinkSheet("email");
    else if (kind === "TELEGRAM") setLinkSheet("telegram");
    else oauthLink.mutate(kind.toLowerCase());
  };

  const header = <PageHeader title={t("pages.profile")} backTo="/" />;
  if (me.isError && !me.data) {
    return (
      <>
        {header}
        <ErrorCard round error={me.error} onRetry={() => void me.refetch()} />
      </>
    );
  }
  if (!me.data) {
    return (
      <>
        {header}
        <div className="flex flex-col gap-4">
          <Skeleton round className="h-12" />
          <Skeleton round className="h-32" />
          <Skeleton round className="h-40" />
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="flex flex-col gap-4">
        <Header me={me.data} />
        <ProfileBlocks
          me={me.data}
          linkError={pageError ?? (oauthLink.isError ? getErrorMessage(oauthLink.error, t("errors.generic")) : null)}
          actions={{
            onConnect,
            onUnlink: (identity) => {
              setPageError(null);
              oauthLink.reset();
              setUnlinking(identity);
            },
            onPayments: () => void navigate("/profile/payments"),
            onRedeemDays: () => setRedeemOpen(true),
            onPromo: () => setPromoOpen(true),
            onDocuments: hasDocuments ? () => setDocumentsOpen(true) : undefined,
            onWithdraw: support.available ? support.open : undefined,
            onUnlinkInBrowser: () => setInBrowserOpen(true),
            onLanguage: () => setLanguageOpen(true),
            onSignOut: () => setSignOutOpen(true),
            languageName: LANGUAGE_NAMES[i18n.language as SupportedLanguage] ?? i18n.language,
          }}
        />
      </div>
      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} />
      <RedeemDaysSheet open={redeemOpen} onClose={() => setRedeemOpen(false)} bonusDays={me.data.bonus_days} />
      <PromoDialog open={promoOpen} onClose={() => setPromoOpen(false)} />
      <InfoDialog open={documentsOpen} onClose={() => setDocumentsOpen(false)} />
      {support.dialog}
      <LinkEmailSheet
        open={linkSheet === "email"}
        onClose={() => setLinkSheet(null)}
        onResult={(result) => {
          setPageError(null);
          link.handleLinkResult(result, "EMAIL");
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
      <SignOutSheet open={signOutOpen} onClose={() => setSignOutOpen(false)} />
      <BottomSheet
        narrow
        bare
        glyph={link.notice && KIND_ICON[link.notice.kind]}
        open={link.notice !== null}
        onClose={link.closeNotice}
        // "Почта" takes the feminine: its own line
        title={
          link.notice?.kind === "EMAIL"
            ? t("link.linkedEmailTitle")
            : t("link.linkedTitle", { kind: link.notice ? t(`profile.kinds.${link.notice.kind}`) : "" })
        }
      >
        <SuccessMessage
          hint={
            link.notice?.status === "merged"
              ? t("link.mergedHint")
              : link.notice?.status === "already_linked"
                ? t("link.alreadyLinkedHint")
                : t("link.linkedHint")
          }
        >
          {link.notice?.status === "merged"
            ? t("link.merged")
            : link.notice?.status === "already_linked"
              ? t("link.alreadyLinked")
              : link.notice?.kind === "EMAIL"
                ? t("link.linkedEmailTitle")
                : t("link.linkedTitle", { kind: link.notice ? t(`profile.kinds.${link.notice.kind}`) : "" })}
        </SuccessMessage>
        <Button variant="outline" size="lg" className="mt-6 w-full" onClick={link.closeNotice}>
          {t("common.continue")}
        </Button>
      </BottomSheet>
      {/* inside the Mini App its next sign-in would make a fresh account: the browser unlinks Telegram */}
      <BottomSheet
        narrow
        // nothing destructive here, only the way to where it can be done
        icon={ExternalLink}
        open={inBrowserOpen}
        onClose={() => setInBrowserOpen(false)}
        title={t("profile.unlinkTitle", { kind: t("profile.kinds.TELEGRAM") })}
      >
        <p className="text-sm text-muted-foreground">{t("profile.unlinkInBrowserText")}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setInBrowserOpen(false)}>
            {t("common.close")}
          </Button>
          <Button
            variant="accent"
            className="flex-1"
            onClick={() => {
              setInBrowserOpen(false);
              openExternal(`${window.location.origin}/profile`);
            }}
          >
            {t("profile.openInBrowser")}
          </Button>
        </div>
      </BottomSheet>
      <ConfirmSheet
        open={unlinking !== null}
        // email reads "почту" in the question, not "Почта": its own line
        title={
          unlinkTitleKind === "EMAIL"
            ? t("profile.unlinkEmailTitle")
            : t("profile.unlinkTitle", { kind: unlinkTitleKind ? t(`profile.kinds.${unlinkTitleKind}`) : "" })
        }
        text={t("profile.unlinkText")}
        confirmLabel={t("profile.unlink")}
        danger
        icon={Link2Off}
        pending={unlink.isPending}
        onConfirm={() => unlinking && unlink.mutate(unlinking.kind)}
        onClose={() => setUnlinking(null)}
      />
    </>
  );
}

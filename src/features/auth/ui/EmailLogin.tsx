import { useMutation } from "@tanstack/react-query";
import { MailWarning } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { legalLocale, useShownLegalLocale } from "@entities/legal/api";
import { authApi, completeLogin, type CaptchaConfig } from "@features/auth/api";
import { CaptchaWidget } from "@features/auth/ui/CaptchaWidget";
import { getErrorMessage } from "@shared/api/http";
import { SheetFooter } from "@shared/ui/BottomSheet";
import { CodeInput } from "@shared/ui/CodeInput";
import { Button } from "@shared/ui/Button";
import { ConfirmSheet } from "@shared/ui/ConfirmSheet";
import { TextInput } from "@shared/ui/TextInput";
import { StepTransition } from "@shared/ui/StepTransition";
import { FormError } from "@shared/ui/FormError";

const RESEND_SECONDS = 60;

const emailError = (input: HTMLInputElement) =>
  input.validity.valueMissing ? "auth.emailRequired" : input.validity.valid ? null : "auth.emailInvalid";
const CODE_LENGTH = 6;

/** The two calls of an email-code flow; verify also finishes it (signs in, or links in the profile). */
export interface EmailCodeFlow {
  sendCode: (email: string, locale: string, captchaToken?: string) => Promise<unknown>;
  verify: (email: string, code: string) => Promise<void>;
}

const signInFlow = (legal?: string): EmailCodeFlow => ({
  sendCode: authApi.sendEmailCode,
  verify: (email, code) => authApi.verifyEmail(email, code, legal).then(completeLogin),
});

export function EmailLogin({
  flow: customFlow,
  captcha = null,
  emailHint,
  onCancel,
}: {
  flow?: EmailCodeFlow;
  /** asked before every code, the resend too */
  captcha?: CaptchaConfig | null;
  /** over the address only: the code step says where the code went instead */
  emailHint?: string;
  /** in a dialog: closes it. The buttons then go to its footer (SheetFooter), cancel first, as every dialog's */
  onCancel?: () => void;
}) {
  const dialog = onCancel !== undefined;
  const formId = useId();
  const legal = useShownLegalLocale();
  const flow = customFlow ?? signInFlow(legal);
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState<ReturnType<typeof emailError>>(null);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [cooldown, setCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRound, setCaptchaRound] = useState(0);
  const [resendAsk, setResendAsk] = useState(false);
  const captchaMissing = captcha !== null && captchaToken === null;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = useMutation({
    mutationFn: () =>
      flow.sendCode(email.trim(), legalLocale(), captchaToken ?? undefined),
    // the token is spent either way
    onSettled: () => captcha && setCaptchaRound((round) => round + 1),
    onSuccess: () => {
      setStep("code");
      setCode("");
      setCooldown(RESEND_SECONDS);
    },
  });
  // signing in flips the session; GuestOnly on /login then navigates to ?next=
  const verify = useMutation({ mutationFn: (value: string) => flow.verify(email.trim(), value) });

  const onCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH && !verify.isPending) verify.mutate(digits);
  };

  if (step === "email") {
    const onSubmit = (event: FormEvent) => {
      event.preventDefault();
      sendCode.mutate();
    };
    return (
      <StepTransition stepKey="email" className="w-full">
        <form id={formId} onSubmit={onSubmit} className="flex w-full flex-col gap-2">
          {emailHint && <p className="pb-1 text-sm text-muted-foreground">{emailHint}</p>}
          <TextInput
            type="email"
            required
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              // re-checked while typing once shown, gone when the value passes
              if (invalid) setInvalid(emailError(e.target));
            }}
            onInvalid={(e) => {
              e.preventDefault();
              setInvalid(emailError(e.currentTarget));
            }}
            aria-invalid={invalid !== null}
            className="w-full"
          />
          {invalid && <FormError className="px-3 text-left">{t(invalid)}</FormError>}
          {captcha && <CaptchaWidget config={captcha} round={captchaRound} onToken={setCaptchaToken} />}
          {/* outside a dialog SheetFooter leaves them in place */}
          <SheetFooter>
            {dialog && (
              <Button variant="glass" onClick={onCancel}>
                {t("common.cancel")}
              </Button>
            )}
            <Button
              type="submit"
              form={formId}
              variant={dialog ? "glassAccent" : "accent"}
              className={dialog ? "" : "w-full"}
              disabled={sendCode.isPending || captchaMissing}
            >
              {t("auth.sendCode")}
            </Button>
          </SheetFooter>
          {sendCode.isError && <FormError>{getErrorMessage(sendCode.error, t("errors.generic"))}</FormError>}
        </form>
      </StepTransition>
    );
  }

  const error = verify.error ?? sendCode.error;
  const resend = (
    <Button
      key="resend"
      variant={dialog ? "glassAccent" : "outline"}
      className={dialog ? "" : "w-full"}
      disabled={cooldown > 0 || sendCode.isPending || captchaMissing}
      onClick={() => setResendAsk(true)}
    >
      {cooldown > 0 && !dialog ? t("auth.resendIn", { seconds: cooldown }) : t("auth.resend")}
    </Button>
  );
  const changeEmail = (
    <Button
      key="change"
      variant={dialog ? "glass" : "outline"}
      className={dialog ? "" : "w-full"}
      onClick={() => {
        setStep("email");
        verify.reset();
        sendCode.reset();
      }}
    >
      {t("auth.changeEmail")}
    </Button>
  );
  return (
    <StepTransition stepKey="code" className="w-full">
      <div className="flex w-full flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t("auth.codeSent", { email: email.trim() })}</p>
        <CodeInput
          value={code}
          length={CODE_LENGTH}
          invalid={verify.isError}
          label={t("auth.codePlaceholder")}
          onChange={onCodeChange}
        />
        {error && <FormError>{getErrorMessage(error, t("errors.generic"))}</FormError>}
        {captcha && cooldown === 0 && (
          <CaptchaWidget config={captcha} round={captchaRound} onToken={setCaptchaToken} />
        )}
        {/* a dialog's footer has no room for the countdown beside "change email": it's said here instead */}
        {dialog && cooldown > 0 && (
          <p className="text-xs text-muted-foreground">{t("auth.resendIn", { seconds: cooldown })}</p>
        )}
        <SheetFooter>{dialog ? [changeEmail, resend] : [resend, changeEmail]}</SheetFooter>
      </div>
      <ConfirmSheet
        open={resendAsk}
        icon={MailWarning}
        title={t("auth.resendTitle")}
        text={t("auth.resendText")}
        confirmLabel={t("auth.resend")}
        onClose={() => setResendAsk(false)}
        onConfirm={() => {
          setResendAsk(false);
          sendCode.mutate();
        }}
      />
    </StepTransition>
  );
}

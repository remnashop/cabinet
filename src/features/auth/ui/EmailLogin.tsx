import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { authApi, completeLogin } from "@features/auth/api";
import { getErrorMessage } from "@shared/api/http";
import { Button } from "@shared/ui/Button";
import { TextInput } from "@shared/ui/TextInput";

const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;

export function EmailLogin() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = useMutation({
    mutationFn: () => authApi.sendEmailCode(email.trim(), i18n.language.startsWith("ru") ? "ru" : "en"),
    onSuccess: () => {
      setStep("code");
      setCode("");
      setCooldown(RESEND_SECONDS);
    },
  });
  // success flips the session; GuestOnly on /login then navigates to ?next=
  const verify = useMutation({
    mutationFn: (value: string) => authApi.verifyEmail(email.trim(), value),
    onSuccess: completeLogin,
  });

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
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-2">
        <TextInput
          type="email"
          required
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full"
        />
        <Button type="submit" variant="accent" className="w-full" disabled={sendCode.isPending}>
          {t("auth.sendCode")}
        </Button>
        {sendCode.isError && <p className="text-sm text-error">{getErrorMessage(sendCode.error, t("errors.generic"))}</p>}
      </form>
    );
  }

  const error = verify.error ?? sendCode.error;
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-muted-foreground">{t("auth.codeSent", { email: email.trim() })}</p>
      <TextInput
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        placeholder={t("auth.codePlaceholder")}
        value={code}
        aria-invalid={verify.isError}
        onChange={(e) => onCodeChange(e.target.value)}
        className="w-full text-center tracking-[0.4em]"
      />
      {error && <p className="text-sm text-error">{getErrorMessage(error, t("errors.generic"))}</p>}
      <Button
        variant="outline"
        className="w-full"
        disabled={cooldown > 0 || sendCode.isPending}
        onClick={() => sendCode.mutate()}
      >
        {cooldown > 0 ? t("auth.resendIn", { seconds: cooldown }) : t("auth.resend")}
      </Button>
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={() => {
          setStep("email");
          verify.reset();
          sendCode.reset();
        }}
      >
        {t("auth.changeEmail")}
      </button>
    </div>
  );
}

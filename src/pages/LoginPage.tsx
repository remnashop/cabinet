import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { authApi } from "@/api/auth";
import { useSessionStore } from "@/store/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { useMiniAppAutoLogin } from "@/hooks/useMiniAppAutoLogin";
import type { components } from "@/api-types";

type TelegramAuthRequest = components["schemas"]["TelegramAuthRequest"];

const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? "";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setMe = useSessionStore((s) => s.setMe);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  async function afterAuth() {
    setMe(await authApi.me());
    navigate("/", { replace: true });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(false);
    try {
      await authApi.login(email, password);
      await afterAuth();
    } catch {
      setError(true);
    }
  }

  async function onTelegram(user: TelegramAuthRequest) {
    setError(false);
    try {
      await authApi.loginTelegram(user);
      await afterAuth();
    } catch {
      setError(true);
    }
  }

  const { attempting } = useMiniAppAutoLogin(afterAuth);

  if (attempting) {
    return <div className="mx-auto mt-16 max-w-sm p-6 text-center text-slate-400">…</div>;
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Card>
        <h1 className="mb-4 text-xl font-semibold">{t("auth.title")}</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{t("auth.error")}</p>}
          <Button type="submit" className="w-full">
            {t("auth.login")}
          </Button>
        </form>
        {botUsername && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400">{t("auth.or")}</span>
            <TelegramLoginButton botUsername={botUsername} onAuth={onTelegram} />
          </div>
        )}
      </Card>
    </div>
  );
}

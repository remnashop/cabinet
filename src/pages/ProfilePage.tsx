import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { authApi } from "@/api/auth";
import { useSessionStore } from "@/store/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const { t } = useTranslation();
  const me = useSessionStore((s) => s.me);
  const clear = useSessionStore((s) => s.clear);

  async function onLogout() {
    await authApi.logout();
    clear();
    window.location.assign("/login");
  }

  if (!me) return null;

  return (
    <div className="mx-auto mt-4 max-w-md space-y-4 p-4">
      <h1 className="text-xl font-semibold">{t("profile.title")}</h1>

      <Card className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">{t("profile.email")}</span>
          <span className="font-medium">{me.email ?? "—"}</span>
        </div>
        {me.email && !me.is_email_verified && (
          <div className="text-right text-xs text-amber-600">{t("profile.emailUnverified")}</div>
        )}
        {me.pending_email && (
          <div className="text-right text-xs text-slate-400">
            {t("profile.pendingEmail", { email: me.pending_email })}
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">{t("profile.language")}</span>
          <span className="font-medium">{me.language}</span>
        </div>
        {me.telegram_id && <div className="text-xs text-slate-400">{t("profile.telegram")}</div>}
      </Card>

      <ChangePasswordCard />
      {me.email && <ChangeEmailCard />}

      <Button variant="outline" className="w-full" onClick={onLogout}>
        {t("profile.logout")}
      </Button>
    </div>
  );
}

function ChangePasswordCard() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("idle");
    try {
      await authApi.changePassword(current, next);
      setStatus("done");
      setCurrent("");
      setNext("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-3">
        <h2 className="text-sm font-semibold">{t("profile.changePassword")}</h2>
        <Input
          type="password"
          placeholder={t("profile.currentPassword")}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder={t("profile.newPassword")}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={8}
          required
        />
        {status === "done" && <p className="text-sm text-green-600">{t("profile.passwordChanged")}</p>}
        {status === "error" && <p className="text-sm text-red-600">{t("profile.passwordError")}</p>}
        <Button type="submit" size="sm">
          {t("profile.save")}
        </Button>
      </form>
    </Card>
  );
}

function ChangeEmailCard() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("idle");
    try {
      await authApi.changeEmail(email);
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-3">
        <h2 className="text-sm font-semibold">{t("profile.changeEmail")}</h2>
        <Input
          type="email"
          placeholder={t("profile.newEmail")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {status === "done" && (
          <p className="text-sm text-green-600">{t("profile.emailChangeRequested")}</p>
        )}
        {status === "error" && <p className="text-sm text-red-600">{t("profile.emailError")}</p>}
        <Button type="submit" size="sm">
          {t("profile.save")}
        </Button>
      </form>
    </Card>
  );
}

import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { authApi } from "@/api/auth";
import { useAfterAuth } from "@/hooks/useAfterAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  const { t } = useTranslation();
  const afterAuth = useAfterAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(false);
    try {
      await authApi.register({ email, password, name: name || null });
      await afterAuth();
    } catch {
      setError(true);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Card>
        <h1 className="mb-4 text-xl font-semibold">{t("register.title")}</h1>
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
            minLength={8}
            required
          />
          <Input
            placeholder={t("register.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{t("register.error")}</p>}
          <Button type="submit" className="w-full">
            {t("register.submit")}
          </Button>
        </form>
        <Link to="/login" className="mt-3 block text-center text-sm text-slate-500">
          {t("register.haveAccount")}
        </Link>
      </Card>
    </div>
  );
}

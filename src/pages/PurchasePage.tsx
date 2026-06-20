import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { subscriptionApi } from "@/api/subscription";
import { findPrice } from "@/lib/offers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { components } from "@/api-types";

type PaymentGatewayType = components["schemas"]["PaymentGatewayType"];

export default function PurchasePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: offers, isLoading, isError } = useQuery({
    queryKey: ["subscription", "offers"],
    queryFn: subscriptionApi.offers,
    retry: false,
  });

  const [planCode, setPlanCode] = useState<string | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [gateway, setGateway] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (isLoading) return <div className="p-6">…</div>;
  if (isError || !offers) {
    return (
      <div className="mx-auto mt-4 max-w-md p-4">
        <Card>{t("purchase.error")}</Card>
      </div>
    );
  }

  const plan = offers.plans.find((p) => p.public_code === planCode) ?? null;
  const duration = plan?.durations.find((d) => d.days === days) ?? null;
  const price = plan && days != null && gateway ? findPrice(plan, days, gateway) : undefined;

  async function onBuy() {
    if (!planCode || days == null || !gateway) return;
    setBusy(true);
    setError(false);
    try {
      const res = await subscriptionApi.purchase(planCode, days, gateway as PaymentGatewayType);
      if (res.payment_url) {
        window.location.assign(res.payment_url);
      } else {
        navigate("/payment/success");
      }
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-4 max-w-md space-y-4 p-4">
      <h1 className="text-xl font-semibold">{t("purchase.title")}</h1>

      {offers.plans.length === 0 ? (
        <Card>{t("purchase.empty")}</Card>
      ) : (
        <>
          <Card className="space-y-2">
            <div className="text-xs text-slate-400">{t("purchase.selectPlan")}</div>
            {offers.plans.map((p) => (
              <button
                key={p.public_code}
                onClick={() => {
                  setPlanCode(p.public_code);
                  setDays(null);
                  setGateway(null);
                }}
                className={`w-full rounded-md border p-3 text-left text-sm ${
                  planCode === p.public_code ? "border-slate-900" : "border-slate-200"
                }`}
              >
                <div className="font-medium">{p.name}</div>
                {p.description && <div className="text-xs text-slate-400">{p.description}</div>}
              </button>
            ))}
          </Card>

          {plan && (
            <Card className="space-y-2">
              <div className="text-xs text-slate-400">{t("purchase.selectDuration")}</div>
              <div className="flex flex-wrap gap-2">
                {plan.durations.map((d) => (
                  <Button
                    key={d.days}
                    size="sm"
                    variant={days === d.days ? "default" : "outline"}
                    onClick={() => {
                      setDays(d.days);
                      setGateway(null);
                    }}
                  >
                    {t("purchase.days", { count: d.days })}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {duration && (
            <Card className="space-y-2">
              <div className="text-xs text-slate-400">{t("purchase.selectGateway")}</div>
              <div className="space-y-2">
                {duration.prices.map((pr) => (
                  <button
                    key={pr.gateway_type}
                    onClick={() => setGateway(pr.gateway_type)}
                    className={`flex w-full items-center justify-between rounded-md border p-2 text-sm ${
                      gateway === pr.gateway_type ? "border-slate-900" : "border-slate-200"
                    }`}
                  >
                    <span>{pr.gateway_type}</span>
                    <span className="font-medium">
                      {pr.is_free
                        ? t("purchase.free")
                        : `${pr.final_amount} ${pr.currency_symbol}`}
                      {pr.discount_percent > 0 && (
                        <span className="ml-1 text-xs text-green-600">
                          {t("purchase.discount", { percent: pr.discount_percent })}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {error && <p className="text-sm text-red-600">{t("purchase.error")}</p>}
          <Button className="w-full" disabled={!price || busy} onClick={onBuy}>
            {t("purchase.buy")}
            {price && !price.is_free ? ` · ${price.final_amount} ${price.currency_symbol}` : ""}
          </Button>
        </>
      )}

      <TrialCard onDone={() => navigate("/")} />
      <PromocodeCard
        onDone={() => queryClient.invalidateQueries({ queryKey: ["subscription"] })}
      />
    </div>
  );
}

function TrialCard({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const [busy, setBusy] = useState(false);

  async function activate() {
    setBusy(true);
    setStatus("idle");
    try {
      await subscriptionApi.activateTrial();
      onDone();
    } catch {
      setStatus("error");
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-2">
      {status === "error" && <p className="text-sm text-red-600">{t("purchase.trialError")}</p>}
      <Button variant="outline" className="w-full" disabled={busy} onClick={activate}>
        {t("purchase.trial")}
      </Button>
    </Card>
  );
}

function PromocodeCard({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  async function apply() {
    setStatus("idle");
    try {
      await subscriptionApi.activatePromocode(code);
      setStatus("done");
      setCode("");
      onDone();
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card className="space-y-2">
      <div className="text-xs text-slate-400">{t("purchase.promocode")}</div>
      <div className="flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} />
        <Button size="sm" variant="outline" disabled={!code} onClick={apply}>
          {t("purchase.promoApply")}
        </Button>
      </div>
      {status === "done" && <p className="text-sm text-green-600">{t("purchase.promoDone")}</p>}
      {status === "error" && <p className="text-sm text-red-600">{t("purchase.promoError")}</p>}
    </Card>
  );
}

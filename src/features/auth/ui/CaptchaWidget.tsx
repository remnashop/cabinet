import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CaptchaConfig } from "@features/auth/api";

// Turnstile and hCaptcha expose the same explicit-render API under different globals
interface CaptchaApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
}

const SCRIPTS: Record<CaptchaConfig["provider"], { src: string; global: "turnstile" | "hcaptcha" }> = {
  TURNSTILE: { src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", global: "turnstile" },
  HCAPTCHA: { src: "https://js.hcaptcha.com/1/api.js?render=explicit", global: "hcaptcha" },
};

const loading = new Map<string, Promise<CaptchaApi>>();

function loadApi(provider: CaptchaConfig["provider"]): Promise<CaptchaApi> {
  const { src, global } = SCRIPTS[provider];
  let promise = loading.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve((window as unknown as Record<string, CaptchaApi>)[global]);
      script.onerror = () => {
        loading.delete(src);
        reject(new Error(`${provider} failed to load`));
      };
      document.head.append(script);
    });
    loading.set(src, promise);
  }
  return promise;
}

/** A fresh widget per `round`: a token is single-use, so every send asks for a new one. */
export function CaptchaWidget({
  config,
  round,
  onToken,
}: {
  config: CaptchaConfig;
  round: number;
  onToken: (token: string | null) => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;
    onTokenRef.current(null);
    loadApi(config.provider)
      .then((api) => {
        if (cancelled || !ref.current) return;
        const id = api.render(ref.current, {
          sitekey: config.site_key,
          theme: "dark",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
        remove = () => api.remove(id);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [config.provider, config.site_key, round]);

  if (failed) return <p className="text-sm text-error">{t("auth.captchaUnavailable")}</p>;
  return <div ref={ref} className="flex min-h-[65px] justify-center" />;
}

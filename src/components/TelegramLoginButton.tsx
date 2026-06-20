import { useEffect, useRef } from "react";
import type { components } from "@/api-types";

type TelegramAuthRequest = components["schemas"]["TelegramAuthRequest"];

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthRequest) => void;
  }
}

export function TelegramLoginButton({
  botUsername,
  onAuth,
}: {
  botUsername: string;
  onAuth: (user: TelegramAuthRequest) => void;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onTelegramAuth = onAuth;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    const node = container.current;
    node?.appendChild(script);
    return () => {
      node?.replaceChildren();
      delete window.onTelegramAuth;
    };
  }, [botUsername, onAuth]);

  return <div ref={container} />;
}

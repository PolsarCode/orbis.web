"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function Turnstile({
  onToken,
  onError,
}: {
  onToken: (token: string | null) => void;
  onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onToken, onError });
  const [ready, setReady] = useState(false);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    handlers.current = { onToken, onError };
  }, [onToken, onError]);

  useEffect(() => {
    const api = window.turnstile;
    if (!ready || !api || !container.current) return;
    const theme = document.documentElement.dataset.theme;
    const id = api.render(container.current, {
      sitekey: turnstileSiteKey,
      theme: theme === "light" || theme === "dark" ? theme : "auto",
      size: "flexible",
      appearance: "interaction-only",
      callback: (token: string) => handlers.current.onToken(token),
      "expired-callback": () => handlers.current.onToken(null),
      "error-callback": () => {
        handlers.current.onToken(null);
        handlers.current.onError();
      },
      "before-interactive-callback": () => setInteractive(true),
      "after-interactive-callback": () => setInteractive(false),
    });
    return () => api.remove(id);
  }, [ready]);

  return (
    <>
      <Script src={SCRIPT_URL} onReady={() => setReady(true)} />
      <div ref={container} className={interactive ? undefined : "pointer-events-none absolute"} />
    </>
  );
}

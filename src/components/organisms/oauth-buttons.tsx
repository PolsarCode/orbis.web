"use client";

import { DiscordFilled, TwitchFilled } from "@ant-design/icons";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import { getOAuthProviders, type OAuthProvider } from "@/lib/api";
import { oauthColors, oauthLabels, startOAuth } from "@/lib/oauth";

const icons: Record<OAuthProvider, ReactNode> = {
  discord: <DiscordFilled />,
  twitch: <TwitchFilled />,
};

export function OAuthIcon({ provider }: { provider: OAuthProvider }) {
  return <span className="flex text-lg leading-none">{icons[provider]}</span>;
}

export function OAuthButtons() {
  const [providers, setProviders] = useState<OAuthProvider[] | null>(null);
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOAuthProviders()
      .then(setProviders)
      .catch(() => setProviders([]));
  }, []);

  if (providers?.length === 0) return null;

  async function start(provider: OAuthProvider) {
    setPending(provider);
    setError(null);
    try {
      await startOAuth(provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 text-xs text-muted uppercase">
        <hr className="flex-1 border-divider" />
        or
        <hr className="flex-1 border-divider" />
      </div>
      {providers === null ? (
        <div
          aria-hidden
          className="grid animate-pulse grid-cols-2 gap-3 motion-reduce:animate-none"
        >
          <span className="h-10 rounded-lg bg-rail-item" />
          <span className="h-10 rounded-lg bg-rail-item" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className={`grid gap-3 ${providers.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {providers.map((provider) => (
              <button
                key={provider}
                type="button"
                aria-label={`Continue with ${oauthLabels[provider]}`}
                disabled={pending !== null}
                onClick={() => start(provider)}
                className={`focus-ring flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-60 ${oauthColors[provider]}`}
              >
                <OAuthIcon provider={provider} />
                {pending === provider ? "Opening…" : oauthLabels[provider]}
              </button>
            ))}
          </div>
          {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        </div>
      )}
    </div>
  );
}

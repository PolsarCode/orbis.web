"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import * as Atom from "@atom";
import * as Template from "@template";
import { completeOAuth } from "@/lib/api";
import {
  isMobileOAuthState,
  isOAuthProvider,
  oauthLabels,
  saveDiscordServers,
  savePendingAvatar,
  savePendingSignup,
  takeOAuthNonce,
} from "@/lib/oauth";
import { useAuthStore } from "@/stores/auth-store";

function Callback() {
  const { provider } = useParams<{ provider: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const loginWithToken = useAuthStore((state) => state.loginWithToken);
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finish() {
      const code = params.get("code");
      const state = params.get("state");
      if (isMobileOAuthState(state)) {
        const callback = new URL("orbis://auth/callback");
        callback.searchParams.set("provider", provider);
        if (code) callback.searchParams.set("code", code);
        if (state) callback.searchParams.set("state", state);
        const oauthError = params.get("error");
        if (oauthError) callback.searchParams.set("error", oauthError);
        const errorDescription = params.get("error_description");
        if (errorDescription) callback.searchParams.set("error_description", errorDescription);
        window.location.replace(callback.toString());
        return;
      }

      const nonce = takeOAuthNonce();
      if (!isOAuthProvider(provider)) throw new Error("That login provider isn’t supported.");
      if (params.get("error") === "access_denied") throw new Error("Login was cancelled.");
      if (!code || !state || !nonce) throw new Error("That login link didn’t work. Please try again.");

      const result = await completeOAuth(
        provider,
        { code, state, nonce },
        useAuthStore.getState().token,
      );
      if (result.access_token) {
        loginWithToken(result.access_token);
        router.replace("/");
      } else if (result.signup) {
        savePendingSignup({ provider, ...result.signup });
        router.replace("/register/username");
      } else if (result.communityId) {
        if (result.servers) {
          saveDiscordServers({ communityId: result.communityId, ...result.servers });
        }
        router.replace(`/communities/${result.communityId}/settings?tab=connections`);
      } else {
        if (result.avatar) savePendingAvatar({ provider, ...result.avatar });
        router.replace("/settings?tab=connections");
      }
    }

    finish().catch((cause: Error) => setError(cause.message));
  }, [params, provider, router, loginWithToken]);

  const label = isOAuthProvider(provider) ? oauthLabels[provider] : "this provider";

  if (error) {
    return (
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Atom.Heading>Couldn’t continue with {label}</Atom.Heading>
        <Atom.ErrorMessage>{error}</Atom.ErrorMessage>
        <Link
          href={signedIn ? "/settings?tab=connections" : "/login"}
          className="focus-ring rounded-sm text-sm text-accent hover:underline"
        >
          {signedIn ? "Back to settings" : "Back to log in"}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Atom.Loader />
      <p className="text-sm text-muted">Finishing up with {label}…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Template.AppTemplate>
      <Template.CenteredTemplate>
        <Suspense>
          <Callback />
        </Suspense>
      </Template.CenteredTemplate>
    </Template.AppTemplate>
  );
}

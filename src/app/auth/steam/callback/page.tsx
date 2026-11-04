"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Template from "@template";
import { connectSteam } from "@/lib/api";
import { takeOAuthNonce } from "@/lib/oauth";
import { useAuthStore } from "@/stores/auth-store";

const CONNECTING = "Connecting Steam and looking at your games…";

function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finish() {
      const { token } = useAuthStore.getState();
      const state = params.get("state");
      const nonce = takeOAuthNonce();
      if (!token) throw new Error("Log in to Orbis, then connect Steam again.");
      if (params.get("openid.mode") === "cancel") throw new Error("Connecting Steam was cancelled.");
      if (!state || !nonce) throw new Error("That Steam link didn’t work. Please try again.");

      const openId = Object.fromEntries(
        [...params.entries()].filter(([key]) => key.startsWith("openid.")),
      );
      await connectSteam(token, { state, nonce, params: openId });
      router.replace("/settings?tab=connections&steam=connected");
    }

    finish().catch((cause: Error) => setError(cause.message));
  }, [params, router]);

  if (error) {
    return (
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Atom.Heading>Couldn’t connect Steam</Atom.Heading>
        <Atom.ErrorMessage>{error}</Atom.ErrorMessage>
        <Link href="/settings?tab=connections" className="focus-ring rounded-sm text-sm text-accent hover:underline">
          Back to settings
        </Link>
      </div>
    );
  }

  return <Molecule.LoadingScreen status={CONNECTING} />;
}

export default function SteamCallbackPage() {
  return (
    <Template.AppTemplate>
      <Template.CenteredTemplate>
        <Suspense fallback={<Molecule.LoadingScreen status={CONNECTING} />}>
          <Callback />
        </Suspense>
      </Template.CenteredTemplate>
    </Template.AppTemplate>
  );
}

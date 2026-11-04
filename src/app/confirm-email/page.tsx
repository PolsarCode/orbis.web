"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Organism from "@organism";
import * as Template from "@template";
import { confirmEmail } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const MISSING_TOKEN = "This link is incomplete. Open the link from the email again.";
const CONFIRMING = "Confirming your email…";
const CARD =
  "flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-divider bg-surface p-8 text-center";

function Confirm() {
  const params = useSearchParams();
  const token = params.get("token");
  const signedIn = useAuthStore((state) => state.token !== null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;

    confirmEmail(token)
      .then(async () => {
        setConfirmed(true);
        if (useAuthStore.getState().token) await useAuthStore.getState().fetchProfile();
      })
      .catch((cause: Error) => setError(cause.message));
  }, [token]);

  const failure = token ? error : MISSING_TOKEN;

  if (failure) {
    return (
      <section className={CARD}>
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger"
        >
          <CircleAlert size={24} />
        </span>
        <Atom.Heading>Couldn’t confirm your email</Atom.Heading>
        <p className="text-sm text-muted">{failure}</p>
        {signedIn ? (
          <Organism.ResendConfirmation />
        ) : (
          <Link href="/login" className="focus-ring rounded-sm text-sm font-semibold text-accent hover:underline">
            Log in to send a new link
          </Link>
        )}
      </section>
    );
  }

  if (confirmed) {
    return (
      <section className={CARD}>
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success"
        >
          <CircleCheck size={24} />
        </span>
        <Atom.Heading>Your email is confirmed</Atom.Heading>
        <p className="text-sm text-muted">
          Thanks for confirming. You can post, comment, and chat now.
        </p>
        <Atom.ButtonLink href={signedIn ? "/" : "/login"}>
          {signedIn ? "Go to Orbis" : "Log in"}
        </Atom.ButtonLink>
      </section>
    );
  }

  return <Molecule.LoadingScreen status={CONFIRMING} />;
}

export default function ConfirmEmailPage() {
  return (
    <Template.AppTemplate>
      <Template.CenteredTemplate>
        <Suspense fallback={<Molecule.LoadingScreen status={CONFIRMING} />}>
          <Confirm />
        </Suspense>
      </Template.CenteredTemplate>
    </Template.AppTemplate>
  );
}

"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { finishOAuthSignup } from "@/lib/api";
import {
  clearPendingSignup,
  oauthLabels,
  parsePendingSignup,
  readPendingSignup,
} from "@/lib/oauth";
import { useAuthStore } from "@/stores/auth-store";
import { SignupTerms } from "./auth-form";

const subscribe = () => () => {};

export function OAuthUsernameForm() {
  const router = useRouter();
  const loginWithToken = useAuthStore((state) => state.loginWithToken);
  const raw = useSyncExternalStore(subscribe, readPendingSignup, () => undefined);
  const signup = useMemo(() => parsePendingSignup(raw), [raw]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (raw !== undefined && !signup && !useAuthStore.getState().token) {
      router.replace("/register");
    }
  }, [raw, signup, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signup) return;
    const username = String(new FormData(event.currentTarget).get("username")).trim();
    const useProviderAvatar = new FormData(event.currentTarget).get("useProviderAvatar") === "on";
    setError(null);
    setPending(true);

    try {
      const { access_token } = await finishOAuthSignup(
        signup.token,
        username,
        useProviderAvatar,
      );
      loginWithToken(access_token);
      clearPendingSignup();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(false);
    }
  }

  if (!signup) return <Atom.Loader />;

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-7">
      <div className="flex flex-col gap-6 rounded-2xl border border-divider bg-surface p-6 shadow-[0_16px_48px_-32px_rgb(0_0_0/0.2)] sm:p-8">
        <Atom.Brand className="text-4xl" />
        <h1 className="font-display text-5xl leading-[1.04] font-bold">Pick a username.</h1>
        <p className="-mt-3 text-sm leading-relaxed text-muted">
          This is how people find and mention you on Orbis. Choose one to finish signing up
          with {oauthLabels[signup.provider]}.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {signup.avatarUrl && (
            <label className="flex items-center gap-3 text-sm text-muted">
              <Image
                src={signup.avatarUrl}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="size-12 rounded-full object-cover"
              />
              <input
                type="checkbox"
                name="useProviderAvatar"
                defaultChecked
                className="size-4 accent-accent"
              />
              Use my {oauthLabels[signup.provider]} profile picture
            </label>
          )}
          <Molecule.FormField
            label="Username"
            name="username"
            size="large"
            required
            autoFocus
            defaultValue={signup.username}
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]+"
            title="3–20 characters: letters, numbers, or underscores"
            extra="Use 3–20 letters, numbers, or underscores. No spaces or symbols."
            autoCapitalize="none"
            autoComplete="username"
          />
          {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
          <Atom.Button
            type="submit"
            size="large"
            loading={pending}
            className="mt-1 w-full"
            icon={<ArrowRight size={17} />}
            iconPlacement="end"
          >
            Continue
          </Atom.Button>
        </form>
        <hr className="border-divider" />
        <p className="text-[13px] text-muted">
          Not you?{" "}
          <Link
            href="/register"
            onClick={clearPendingSignup}
            className="focus-ring rounded-sm text-accent hover:underline"
          >
            Start over
          </Link>
        </p>
        <SignupTerms />
      </div>
    </div>
  );
}

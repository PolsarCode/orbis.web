"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { safeNext } from "@/lib/login";
import { useAuthStore } from "@/stores/auth-store";
import { OAuthButtons } from "./oauth-buttons";
import { SUSPENSION_NOTICE_KEY } from "./suspended-account-watcher";

type Mode = "login" | "signup";

const subscribeToNothing = () => () => {};

function readSuspensionNotice() {
  try {
    return sessionStorage.getItem(SUSPENSION_NOTICE_KEY);
  } catch {
    return null;
  }
}

export function SignupTerms() {
  return (
    <p className="text-[11px] text-muted">
      By signing up, you agree to our{" "}
      <Link href="/terms" className="underline hover:text-foreground">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/guidelines" className="underline hover:text-foreground">
        Community guidelines
      </Link>
      .
    </p>
  );
}

const content = {
  login: {
    title: "Welcome home.",
    submit: "Log in",
    switchText: "New to Orbis?",
    switchLabel: "Create an account",
    switchHref: "/register",
    footnote: false,
  },
  signup: {
    title: "Find your people.",
    submit: "Create account",
    switchText: "Already have a home here?",
    switchLabel: "Log in",
    switchHref: "/login",
    footnote: true,
  },
};

export function AuthForm({
  mode,
  compact = false,
  onAuthenticated,
  onSwitch,
}: {
  mode: Mode;
  compact?: boolean;
  onAuthenticated?: () => void;
  onSwitch?: () => void;
}) {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const checking = Boolean(Molecule.turnstileSiteKey) && !token;
  const notice = useSyncExternalStore(subscribeToNothing, readSuspensionNotice, () => null);
  const shownError = error ?? (mode === "login" ? notice : null);
  const { title, submit, switchText, switchLabel, switchHref, footnote } =
    content[mode];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      sessionStorage.removeItem(SUSPENSION_NOTICE_KEY);
    } catch {}
    setError(null);
    setPending(true);

    try {
      const password = String(form.get("password"));
      if (mode === "login") {
        await login({
          identifier: String(form.get("identifier")).trim(),
          password,
          turnstileToken: token ?? undefined,
        });
      } else {
        await signup({
          email: String(form.get("email")),
          username: String(form.get("username")),
          password,
          turnstileToken: token ?? undefined,
        });
      }
      if (onAuthenticated) onAuthenticated();
      else
        router.push(
          safeNext(new URLSearchParams(window.location.search).get("next")) ?? "/",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(false);
      if (Molecule.turnstileSiteKey) {
        setToken(null);
        setAttempt((current) => current + 1);
      }
    }
  }

  return (
    <div
      className={`flex w-full flex-col ${compact ? "max-w-[400px] gap-10 sm:gap-16" : "max-w-[480px] gap-7"}`}
    >
      {!compact && (
        <Link
          href="/"
          className="focus-ring inline-flex w-fit items-center gap-2 rounded-sm text-[13px] transition-colors hover:text-accent"
        >
          <ArrowLeft size={16} />
          Back to homepage
        </Link>
      )}
      <div
        className={`flex flex-col gap-6 ${compact ? "" : "rounded-2xl border border-divider bg-surface p-6 shadow-[0_16px_48px_-32px_rgb(0_0_0/0.2)] sm:p-8"}`}
      >
        {!compact && <Atom.Brand className="text-4xl" />}
        <h1
          className={`font-display leading-[1.04] font-bold ${compact ? "text-3xl" : "text-5xl"}`}
        >
          {title}
        </h1>
        {!compact && (
          <p className="-mt-3 text-sm leading-relaxed text-muted">
            {mode === "login"
              ? "Pick up where you left off. Your communities are waiting."
              : "Make a little space for your interests, and find others who share them."}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {mode === "login" ? (
            <Molecule.FormField
              label="Email or username"
              name="identifier"
              size="large"
              required
              autoCapitalize="none"
              autoComplete="username"
            />
          ) : (
            <>
              <Molecule.FormField
                label="Email"
                name="email"
                type="email"
                size="large"
                required
                autoComplete="email"
              />
              <Molecule.FormField
                label="Username"
                name="username"
                size="large"
                required
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                title="3–20 characters: letters, numbers, or underscores"
                extra="Use 3–20 letters, numbers, or underscores. No spaces or symbols."
                autoCapitalize="none"
                autoComplete="username"
              />
            </>
          )}
          <Molecule.FormField
            label="Password"
            name="password"
            type="password"
            size="large"
            required
            minLength={6}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            extra={mode === "signup" ? "At least 6 characters." : undefined}
          />
          {Molecule.turnstileSiteKey && (
            <Molecule.Turnstile
              key={attempt}
              onToken={(value) => {
                setToken(value);
                if (value) setCheckFailed(false);
              }}
              onError={() => setCheckFailed(true)}
            />
          )}
          {shownError && <Atom.ErrorMessage>{shownError}</Atom.ErrorMessage>}
          {checkFailed && !shownError && (
            <Atom.ErrorMessage>
              We couldn’t check that you’re human. Refresh the page and try again.
            </Atom.ErrorMessage>
          )}
          <Atom.Button
            type="submit"
            size="large"
            disabled={checking && !pending}
            loading={pending}
            className={compact ? "w-fit" : "mt-1 w-full"}
            icon={compact ? undefined : <ArrowRight size={17} />}
            iconPlacement="end"
          >
            {submit}
          </Atom.Button>
        </form>
        <OAuthButtons />
        <hr className="border-divider" />
        <p className="text-[13px] text-muted">
          {switchText}{" "}
          {onSwitch ? (
            <button
              type="button"
              onClick={onSwitch}
              className="focus-ring cursor-pointer rounded-sm text-accent hover:underline"
            >
              {switchLabel}
            </button>
          ) : (
            <Link
              href={switchHref}
              className="focus-ring rounded-sm text-accent hover:underline"
            >
              {switchLabel}
            </Link>
          )}
        </p>
        {footnote && <SignupTerms />}
      </div>
    </div>
  );
}

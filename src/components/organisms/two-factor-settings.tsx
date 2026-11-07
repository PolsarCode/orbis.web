"use client";

import { App, Tooltip } from "antd";
import { Copy, Download, ShieldCheck, ShieldOff } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  disableTwoFactor,
  enableTwoFactor,
  setupTwoFactor,
  type Profile,
  type TwoFactorSetup,
} from "@/lib/api";
import { requireToken, useAuthStore } from "@/stores/auth-store";

function secretChunks(secret: string) {
  return secret.match(/.{1,4}/g) ?? [secret];
}

function SetupStep({
  number,
  title,
  description,
  last = false,
  children,
}: {
  number: number;
  title: string;
  description: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="relative flex gap-4">
      {!last && <span aria-hidden className="absolute top-9 bottom-2 left-3.5 w-px bg-divider" />}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-bold text-accent">
        {number}
      </span>
      <div className={`flex min-w-0 flex-1 flex-col gap-3 pt-0.5 ${last ? "" : "pb-8"}`}>
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-muted">{description}</p>
        </div>
        {children}
      </div>
    </li>
  );
}

function RecoveryCodes({
  username,
  codes,
  onDone,
}: {
  username: string;
  codes: string[];
  onDone: () => void;
}) {
  const { message } = App.useApp();

  function copy() {
    navigator.clipboard
      .writeText(codes.join("\n"))
      .then(() => message.success("Recovery codes copied."))
      .catch(() => message.error("Couldn’t copy them. Select the codes and copy them instead."));
  }

  function download() {
    const text = [
      `Orbis recovery codes for @${username}`,
      "",
      ...codes,
      "",
      "Each code works once. Use one to log in if you can't use your authenticator app.",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "orbis-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <ShieldCheck size={18} aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">Two-factor sign-in is on</p>
          <p className="text-xs text-muted">
            Save these recovery codes somewhere safe. Each one works once if you lose your phone,
            and you won’t see them again.
          </p>
        </div>
      </div>
      <ol
        aria-label="Recovery codes"
        className="grid gap-x-8 gap-y-2.5 rounded-lg border border-dashed border-divider bg-background px-5 py-4 sm:grid-cols-2"
      >
        {codes.map((code, index) => (
          <li key={code} className="flex items-baseline gap-3 font-mono">
            <span aria-hidden className="w-5 shrink-0 text-right text-[11px] text-muted tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm tracking-wider">{code}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <Atom.Button size="small" variant="secondary" icon={<Copy size={14} />} onClick={copy}>
          Copy
        </Atom.Button>
        <Atom.Button size="small" variant="secondary" icon={<Download size={14} />} onClick={download}>
          Download
        </Atom.Button>
        <Atom.Button size="small" onClick={onDone} className="sm:ml-auto">
          I’ve saved them
        </Atom.Button>
      </div>
    </div>
  );
}

export function TwoFactorSettings({ profile }: { profile: Profile }) {
  const { message } = App.useApp();
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [turningOff, setTurningOff] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<void>) {
    setError(null);
    setPending(true);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setSetup(null);
    setTurningOff(false);
    setCode("");
    setError(null);
  }

  if (!profile.hasPassword) {
    return (
      <p className="text-sm text-muted">
        Two-factor sign-in protects logging in with a password. You log in with Discord or
        Twitch, so their own security protects your account.
      </p>
    );
  }

  if (recoveryCodes) {
    return (
      <RecoveryCodes
        username={profile.username}
        codes={recoveryCodes}
        onDone={() => setRecoveryCodes(null)}
      />
    );
  }

  const codeField = (label: string) => (
    <Molecule.FormField
      label={label}
      name="two-factor-code"
      autoFocus
      maxLength={32}
      autoComplete="one-time-code"
      autoCapitalize="none"
      value={code}
      onChange={(event) => setCode(event.target.value)}
      className="max-w-60"
    />
  );

  if (profile.twoFactorEnabled) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <ShieldCheck size={16} aria-hidden className="text-success" />
          On
        </p>
        {turningOff ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              run(async () => {
                await disableTwoFactor(requireToken(), code.trim());
                await fetchProfile();
                reset();
                message.success("Two-factor sign-in is off.");
              });
            }}
          >
            {codeField("Code from your authenticator app, or a recovery code")}
            {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
            <div className="flex gap-2">
              <Molecule.ReadOnlyGate action="turn off two-factor sign-in">
                <Atom.Button type="submit" size="small" danger loading={pending} disabled={!code.trim()}>
                  Turn off
                </Atom.Button>
              </Molecule.ReadOnlyGate>
              <Atom.Button size="small" variant="secondary" onClick={reset}>
                Cancel
              </Atom.Button>
            </div>
          </form>
        ) : (
          <Molecule.ReadOnlyGate action="turn off two-factor sign-in">
            <Atom.Button
              size="small"
              variant="secondary"
              icon={<ShieldOff size={14} />}
              onClick={() => setTurningOff(true)}
              className="w-fit"
            >
              Turn off
            </Atom.Button>
          </Molecule.ReadOnlyGate>
        )}
      </div>
    );
  }

  if (setup) {
    const copyKey = () =>
      navigator.clipboard
        .writeText(setup.secret)
        .then(() => message.success("Key copied."))
        .catch(() => message.error("Couldn’t copy it. Select the key and copy it instead."));

    return (
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            const codes = await enableTwoFactor(requireToken(), code.trim());
            await fetchProfile();
            reset();
            setRecoveryCodes(codes);
          });
        }}
      >
        <ol className="flex flex-col">
          <SetupStep
            number={1}
            title="Scan the QR code"
            description="Use an authenticator app, like Google Authenticator, Microsoft Authenticator, or 1Password."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Image
                src={setup.qrCode}
                alt="QR code for your authenticator app"
                width={168}
                height={168}
                unoptimized
                className="shrink-0 rounded-lg bg-white p-2.5 shadow-[0_10px_28px_-14px_rgb(0_0_0/0.6)] ring-1 ring-black/5"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-xs text-muted">Can’t scan it? Type this key into the app instead.</p>
                <div className="flex items-center gap-2 rounded-md border border-divider bg-background py-1.5 pr-1.5 pl-3">
                  <code className="flex min-w-0 flex-1 flex-wrap gap-x-2.5 gap-y-1 font-mono text-[13px] tracking-wider select-all">
                    {secretChunks(setup.secret).map((chunk, index) => (
                      <span key={index}>{chunk}</span>
                    ))}
                  </code>
                  <Tooltip title="Copy key">
                    <button
                      type="button"
                      aria-label="Copy key"
                      onClick={copyKey}
                      className="icon-button shrink-0 cursor-pointer self-start"
                    >
                      <Copy size={16} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </SetupStep>
          <SetupStep
            number={2}
            title="Enter the 6-digit code"
            description="Type the code your app shows for Orbis. It changes every 30 seconds."
            last
          >
            <Molecule.CodeInput value={code} onChange={setCode} className="max-w-xs" />
          </SetupStep>
        </ol>
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex gap-2 border-t border-divider pt-5">
          <Molecule.ReadOnlyGate action="turn on two-factor sign-in">
            <Atom.Button
              type="submit"
              size="small"
              icon={<ShieldCheck size={14} />}
              loading={pending}
              disabled={code.length < Molecule.CODE_LENGTH}
            >
              Turn on
            </Atom.Button>
          </Molecule.ReadOnlyGate>
          <Atom.Button size="small" variant="secondary" onClick={reset}>
            Cancel
          </Atom.Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <Molecule.ReadOnlyGate action="turn on two-factor sign-in">
        <Atom.Button
          size="small"
          icon={<ShieldCheck size={14} />}
          loading={pending}
          onClick={() =>
            run(async () => {
              setSetup(await setupTwoFactor(requireToken()));
              setCode("");
            })
          }
          className="w-fit"
        >
          Set up
        </Atom.Button>
      </Molecule.ReadOnlyGate>
    </div>
  );
}

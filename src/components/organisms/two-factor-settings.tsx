"use client";

import { App } from "antd";
import { Copy, Download, ShieldCheck, ShieldOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  disableTwoFactor,
  enableTwoFactor,
  setupTwoFactor,
  type Profile,
  type TwoFactorSetup,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

function token() {
  const { token } = useAuthStore.getState();
  if (!token) throw new Error("Please log in again.");
  return token;
}

function groupSecret(secret: string) {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
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
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Two-factor sign-in is on. Save these recovery codes somewhere safe. Each one works once
        if you lose your phone, and you won’t see them again.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-divider bg-background p-4 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Atom.Button size="small" variant="secondary" icon={<Copy size={14} />} onClick={copy}>
          Copy
        </Atom.Button>
        <Atom.Button size="small" variant="secondary" icon={<Download size={14} />} onClick={download}>
          Download
        </Atom.Button>
        <Atom.Button size="small" onClick={onDone}>
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

  const codeField = (label: string, numeric: boolean) => (
    <Molecule.FormField
      label={label}
      name="two-factor-code"
      autoFocus
      maxLength={numeric ? 7 : 32}
      inputMode={numeric ? "numeric" : undefined}
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
                await disableTwoFactor(token(), code.trim());
                await fetchProfile();
                reset();
                message.success("Two-factor sign-in is off.");
              });
            }}
          >
            {codeField("Code from your authenticator app, or a recovery code", false)}
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
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            const codes = await enableTwoFactor(token(), code.trim());
            await fetchProfile();
            reset();
            setRecoveryCodes(codes);
          });
        }}
      >
        <ol className="flex list-decimal flex-col gap-4 pl-5 text-sm">
          <li>
            Scan this QR code with an authenticator app, like Google Authenticator, Microsoft
            Authenticator, or 1Password.
            <Image
              src={setup.qrCode}
              alt="QR code for your authenticator app"
              width={180}
              height={180}
              unoptimized
              className="mt-3 rounded-md bg-white p-2"
            />
            <p className="mt-2 text-xs text-muted">
              Can’t scan it? Type this key into the app instead:
            </p>
            <code className="mt-1 block font-mono text-xs break-all select-all">
              {groupSecret(setup.secret)}
            </code>
          </li>
          <li>
            Enter the 6-digit code the app shows.
            <div className="mt-3">{codeField("Code", true)}</div>
          </li>
        </ol>
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex gap-2">
          <Molecule.ReadOnlyGate action="turn on two-factor sign-in">
            <Atom.Button type="submit" size="small" loading={pending} disabled={!code.trim()}>
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
              setSetup(await setupTwoFactor(token()));
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

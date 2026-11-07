"use client";

import { App, Switch } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  disconnectSteam,
  getSteamStatus,
  importSteamGames,
  updateSteamSettings,
  type SteamStatus,
} from "@/lib/api";
import { startSteamConnect } from "@/lib/oauth";
import { useAuthStore } from "@/stores/auth-store";

function gamesLabel(count: number) {
  return `${count} ${count === 1 ? "game" : "games"}`;
}

function SteamImportModal({
  open,
  count,
  remindOnDecline = false,
  onClose,
  onImported,
}: {
  open: boolean;
  count: number;
  remindOnDecline?: boolean;
  onClose: () => void;
  onImported: (status: SteamStatus) => void;
}) {
  const { message } = App.useApp();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function decline() {
    onClose();
    if (remindOnDecline) {
      message.info(
        "No problem. You can import your Steam games anytime from Settings → Connections → Steam.",
      );
    }
  }

  async function confirm() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      const { imported, status } = await importSteamGames(token);
      onImported(status);
      onClose();
      message.success(
        imported === 0
          ? "Everything you’ve played is already in your library."
          : `Added ${gamesLabel(imported)} from Steam to your library.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.Dialog open={open} width={460} onCancel={pending ? undefined : decline}>
      <div className="flex flex-col gap-6">
        <Molecule.ModalHeader
          eyebrow="Steam"
          title="Import your Steam games?"
          description={`You’ve played ${gamesLabel(count)} on Steam that aren’t in your library yet. Add them with your hours?`}
        />
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px] text-muted">
          <li>
            Games you played in the last two weeks are added as Playing, the rest as On hold. You
            can change any of them later.
          </li>
          <li>Nothing is posted to your communities’ feeds.</li>
        </ul>
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex justify-end gap-2 border-t border-divider pt-6">
          <Atom.Button variant="secondary" disabled={pending} onClick={decline}>
            Not now
          </Atom.Button>
          <Atom.Button loading={pending} onClick={confirm}>
            Import {gamesLabel(count)}
          </Atom.Button>
        </div>
      </div>
    </Molecule.Dialog>
  );
}

function ConnectedPrompt({
  importable,
  onImported,
}: {
  importable: number;
  onImported: (status: SteamStatus) => void;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  return (
    <SteamImportModal
      open={!dismissed && params.get("steam") === "connected" && importable > 0}
      count={importable}
      remindOnDecline
      onClose={() => {
        setDismissed(true);
        router.replace("/settings?tab=connections", { scroll: false });
      }}
      onImported={onImported}
    />
  );
}

export function SteamConnection() {
  const [status, setStatus] = useState<SteamStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getSteamStatus(token)
      .then(setStatus)
      .catch(() => setFailed(true));
  }, []);

  async function run(action: (token: string) => Promise<SteamStatus | void>) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      const next = await action(token);
      if (next) setStatus(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (failed) return <Atom.ErrorMessage>Couldn’t load your Steam connection.</Atom.ErrorMessage>;
  if (!status || (!status.enabled && !status.account)) return null;

  const { account } = status;

  return (
    <Molecule.SettingsSection
      title="Steam"
      description="Bring your Steam games, playtime, and achievements into your library. Steam isn’t used to log in to Orbis."
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#171a21] text-white"
        >
          <Molecule.SteamIcon size={16} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">Steam</span>
          <span className="truncate text-xs text-muted">
            {account
              ? `Connected as ${account.personaName} · ${account.matched} of ${account.games} games found`
              : "Bring your Steam games and playtime into your library"}
          </span>
        </div>
        {account ? (
          <Atom.Button
            size="small"
            variant="secondary"
            loading={pending}
            onClick={() =>
              run(async (token) => {
                await disconnectSteam(token);
                setStatus({ ...status, account: null });
              })
            }
          >
            Disconnect
          </Atom.Button>
        ) : (
          <Atom.Button size="small" loading={pending} onClick={() => run(startSteamConnect)}>
            Connect
          </Atom.Button>
        )}
      </div>
      {account && (
        <label className="flex items-center justify-between gap-3 pl-11 text-xs">
          <span className="text-muted">
            Add games to my library as Playing the first time I play them
          </span>
          <Switch
            size="small"
            aria-label="Add games to my library the first time I play them"
            checked={account.trackGames}
            disabled={pending}
            onChange={(trackGames) => run((token) => updateSteamSettings(token, { trackGames }))}
          />
        </label>
      )}
      {account && (
        <label className="flex items-center justify-between gap-3 pl-11 text-xs">
          <span className="text-muted">
            Show friends and community members what I’m playing
          </span>
          <Switch
            size="small"
            aria-label="Show friends and community members what I’m playing"
            checked={account.showPlaying}
            disabled={pending}
            onChange={(showPlaying) => run((token) => updateSteamSettings(token, { showPlaying }))}
          />
        </label>
      )}
      {account && account.importable > 0 && (
        <div className="flex items-center justify-between gap-3 pl-11 text-xs">
          <span className="text-muted">
            {gamesLabel(account.importable)} you’ve played aren’t in your library yet
          </span>
          <Atom.Button size="small" variant="secondary" onClick={() => setImportOpen(true)}>
            Import games
          </Atom.Button>
        </div>
      )}
      {account?.gamesPrivate && (
        <p className="pl-11 text-xs text-warning">
          Your Steam game details are private, so Orbis can’t see your games. In Steam, open
          your profile’s Privacy Settings and set Game details to Public.
        </p>
      )}
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      {account && (
        <>
          <SteamImportModal
            open={importOpen}
            count={account.importable}
            onClose={() => setImportOpen(false)}
            onImported={setStatus}
          />
          <Suspense fallback={null}>
            <ConnectedPrompt importable={account.importable} onImported={setStatus} />
          </Suspense>
        </>
      )}
    </Molecule.SettingsSection>
  );
}

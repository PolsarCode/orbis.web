"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Organism from "@organism";
import { getInvitePreview, type InvitePreview } from "@/lib/api";
import { useReadOnly } from "@/lib/read-only";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";

type Loaded = { code: string; invite: InvitePreview | null; failed?: boolean };

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const token = useSyncExternalStore(
    useAuthStore.subscribe,
    () => useAuthStore.getState().token,
    () => null,
  );
  const acceptInvite = useCommunityStore((state) => state.acceptInvite);
  const readOnly = useReadOnly();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInvitePreview(code)
      .then((invite) => setLoaded({ code, invite }))
      .catch(() => setLoaded({ code, invite: null, failed: true }));
  }, [code]);

  async function join() {
    setError(null);
    setJoining(true);
    try {
      const community = await acceptInvite(code);
      router.replace(`/communities/${community.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setJoining(false);
    }
  }

  const current = loaded?.code === code ? loaded : null;
  const community = current?.invite?.community;
  const background = community?.backgroundUrl ?? community?.coverUrl ?? null;

  return (
    <div className="relative isolate flex min-h-dvh flex-1 flex-col items-center gap-6 p-4 sm:p-6">
      {current && background && (
        <Image
          src={background}
          alt=""
          fill
          priority
          unoptimized={!background.startsWith("/")}
          className="-z-20 object-cover"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-black/55 backdrop-blur-[2px]" />
      <div className="self-start rounded-xl bg-surface/90 px-3 py-2.5 shadow-lg backdrop-blur">
        <Atom.Brand className="text-[28px]" />
      </div>
      <main className="my-auto w-full max-w-[440px] overflow-hidden rounded-2xl bg-surface shadow-2xl">
        {!current ? (
          <div className="flex justify-center py-16">
            <Atom.Loader />
          </div>
        ) : current.failed ? (
          <div className="p-6">
            <Molecule.ConnectionError onRetry={() => window.location.reload()} />
          </div>
        ) : !current.invite ? (
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <h1 className="font-display text-3xl leading-[1.04] font-bold">Invite invalid.</h1>
            <p className="text-sm text-muted">
              This invite may have expired, reached its limit, or been revoked. Ask whoever sent
              it for a new one.
            </p>
            <Atom.ButtonLink href="/" size="large" className="w-fit">
              Go to Orbis
            </Atom.ButtonLink>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-6 sm:pb-8">
            <Molecule.InviteSummary invite={current.invite} />
            <div className="flex flex-col gap-4 px-6">
              {!token ? (
                <Organism.AuthForm
                  key={mode}
                  mode={mode}
                  compact
                  onAuthenticated={join}
                  onSwitch={() => setMode(mode === "login" ? "signup" : "login")}
                />
              ) : (
                <>
                  {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
                  {readOnly && (
                    <div className="flex flex-col gap-1 rounded-lg bg-warning/15 p-3 text-[13px]">
                      <p>
                        <strong>Confirm your email first to join.</strong>{" "}
                        <span className="text-muted">
                          Open the link we emailed you, then come back to this invite.
                        </span>
                      </p>
                      <Organism.ResendConfirmation />
                    </div>
                  )}
                  <Molecule.ReadOnlyGate action="join">
                    <Atom.Button size="large" block loading={joining} onClick={join}>
                      Join {current.invite.community.name}
                    </Atom.Button>
                  </Molecule.ReadOnlyGate>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

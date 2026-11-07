"use client";

import { App } from "antd";
import { Download, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  confirmDeletion,
  DeletionCodeExpiredError,
  downloadMyData,
  getDeletionPreview,
  requestDeletionCode,
  type DeletionPreview,
  type OwnedCommunityFate,
} from "@/lib/api";
import { saveFile } from "@/lib/save-file";
import { longDate, minutesAndSeconds } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { requireToken, useAuthStore } from "@/stores/auth-store";

type Challenge = { code: string; seconds: number; deadline: number };

export function DownloadDataSettings() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    setPending(true);
    try {
      const { blob, filename } = await downloadMyData(requireToken());
      saveFile(blob, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.SettingsSection
      title="Download your data"
      description="Get a copy of what you’ve put into Orbis as a JSON file, ready to keep or open in another app."
    >
      <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px] text-muted">
        <li>Your profile and settings, posts, comments, and forum threads and posts.</li>
        <li>The messages you sent, your library, your friends, and your communities.</li>
        <li>Other people’s messages and private details aren’t included.</li>
      </ul>
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <Atom.Button
        icon={<Download size={14} />}
        loading={pending}
        onClick={download}
        className="w-fit"
      >
        Download your data
      </Atom.Button>
    </Molecule.SettingsSection>
  );
}

function OwnedCommunities({ communities }: { communities: OwnedCommunityFate[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold">Communities you own</h4>
        <p className="text-xs text-muted">
          Each one passes to its longest-serving admin. A community without admins is deleted
          with everything in it.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-divider rounded-lg border border-divider">
        {communities.map((community) => (
          <li key={community.id} className="flex min-w-0 flex-col gap-0.5 p-3">
            <Link
              href={`/communities/${community.id}`}
              className="focus-ring w-fit max-w-full truncate rounded-sm text-sm font-semibold hover:underline"
            >
              {community.name}
            </Link>
            {community.successor ? (
              <p className="truncate text-xs text-muted">
                Passes to{" "}
                <Molecule.UserLink username={community.successor.username}>
                  @{community.successor.username}
                </Molecule.UserLink>
              </p>
            ) : (
              <p className="text-xs text-danger">Will be deleted</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeleteAccountSettings() {
  const { message } = App.useApp();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<Molecule.CodeInputRef>(null);
  const now = useNow(challenge !== null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    let current = true;
    getDeletionPreview(token)
      .then((result) => {
        if (current) setPreview(result);
      })
      .catch((e) => {
        if (current) setPreviewError(e instanceof Error ? e.message : "Something went wrong.");
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  const remaining = challenge
    ? Math.max(0, Math.min(challenge.seconds, Math.ceil((challenge.deadline - now) / 1000)))
    : 0;
  const expired = challenge !== null && remaining === 0;

  useEffect(() => {
    if (challenge && !pending && !expired) codeRef.current?.focus();
  }, [challenge, pending, expired]);

  async function start() {
    setError(null);
    setPending(true);
    try {
      const sentAt = Date.now();
      const { code: next, expiresIn } = await requestDeletionCode(requireToken());
      setChallenge({ code: next, seconds: expiresIn, deadline: sentAt + expiresIn * 1000 });
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    setChallenge(null);
    setCode("");
    setError(null);
  }

  async function submit(value: string) {
    setError(null);
    setPending(true);
    try {
      const { deleteAt } = await confirmDeletion(requireToken(), value);
      message.success(
        `Your account will be deleted on ${longDate(deleteAt)}. Sign in before then to cancel.`,
        10,
      );
      logout();
      router.replace("/");
    } catch (e) {
      if (e instanceof DeletionCodeExpiredError) {
        setChallenge((current) => current && { ...current, deadline: 0 });
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
      setCode("");
      setPending(false);
    }
  }

  function handleCode(value: string) {
    setCode(value);
    if (value.length === Molecule.CODE_LENGTH && !expired && !pending) void submit(value);
  }

  return (
    <Molecule.SettingsSection
      danger
      title="Delete account"
      description="Your account is deleted for good 30 days after you confirm. Download your data first if you want a copy."
    >
      {challenge ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted">
            {expired ? (
              "This code expired. Start over to get a new one."
            ) : (
              <>
                Type this code into the boxes below within{" "}
                <strong className="font-semibold text-foreground tabular-nums">
                  {minutesAndSeconds(remaining)}
                </strong>{" "}
                to confirm.
              </>
            )}
          </p>
          <p
            className={`font-display text-4xl leading-none font-bold tracking-[0.25em] tabular-nums ${
              expired ? "text-muted" : ""
            }`}
          >
            {challenge.code}
          </p>
          <Molecule.CodeInput
            ref={codeRef}
            value={code}
            onChange={handleCode}
            disabled={pending || expired}
            invalid={expired}
            className="max-w-xs"
          />
          {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
          <div className="flex flex-wrap gap-2">
            <Atom.Button variant="secondary" disabled={pending} onClick={cancel}>
              Cancel
            </Atom.Button>
            {expired && (
              <Atom.Button danger icon={<RotateCcw size={14} />} loading={pending} onClick={start}>
                Start over
              </Atom.Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px] text-muted">
            <li>
              Everything you’ve posted is deleted: posts, reposts, comments, forum threads and
              posts, and the messages you sent.
            </li>
            <li>So are your library, likes, bookmarks, friends, and the pictures you uploaded.</li>
            <li>
              You’re signed out everywhere, and your profile, posts, and comments are hidden while
              it waits.
            </li>
            <li>Signing in within 30 days cancels the deletion and brings everything back.</li>
            <li>Your Discord, Twitch, and Steam connections are disconnected.</li>
          </ul>
          {previewError ? (
            <Molecule.RetryAlert
              onRetry={() => {
                setPreviewError(null);
                setAttempt((count) => count + 1);
              }}
            >
              {previewError}
            </Molecule.RetryAlert>
          ) : !preview ? (
            <div className="flex min-h-24">
              <Atom.Loader />
            </div>
          ) : (
            <>
              {preview.ownedCommunities.length > 0 && (
                <OwnedCommunities communities={preview.ownedCommunities} />
              )}
              {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
              <Atom.Button
                danger
                icon={<Trash2 size={14} />}
                loading={pending}
                onClick={start}
                className="w-fit"
              >
                Delete account
              </Atom.Button>
            </>
          )}
        </>
      )}
    </Molecule.SettingsSection>
  );
}

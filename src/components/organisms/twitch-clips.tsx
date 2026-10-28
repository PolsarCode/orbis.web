"use client";

import { Modal } from "antd";
import { Clapperboard, ExternalLink, Play, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { getCommunityClips, getUserClips, type Clip, type ClipPage } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";

type ClipSource = { communityId?: number; username?: string };

function loadClips({ communityId, username }: ClipSource, cursor?: string): Promise<ClipPage> {
  const { token } = useAuthStore.getState();
  return communityId !== undefined
    ? getCommunityClips(token, communityId, cursor)
    : getUserClips(token, username ?? "", cursor);
}

function clipLength(seconds: number) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function clipDetails(clip: Clip) {
  const views = `${clip.viewCount.toLocaleString()} ${clip.viewCount === 1 ? "view" : "views"}`;
  return `${views} · ${timeAgo(clip.createdAt)} · Clipped by ${clip.creatorName}`;
}

const source = <span className="text-xs text-muted">Most viewed on Twitch</span>;

export function TwitchClips({ communityId, username, name }: ClipSource & { name: string }) {
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState<Clip | null>(null);

  useEffect(() => {
    let current = true;
    loadClips({ communityId, username })
      .then((page) => {
        if (!current) return;
        setClips(page.items);
        setCursor(page.nextCursor);
        setError(null);
      })
      .catch((e: Error) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [communityId, username, attempt]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await loadClips({ communityId, username }, cursor);
      setClips((existing) => [...(existing ?? []), ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (clips === null) {
    return error ? (
      <div className="sm:pt-8">
        <Molecule.FeedState
          role="alert"
          icon={<Clapperboard size={24} strokeWidth={1.5} />}
          title="Couldn’t load the clips."
          description={error}
          action={
            <Atom.Button variant="secondary" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Atom.Button>
          }
        />
      </div>
    ) : (
      <Molecule.TabSection title="Clips" actions={source}>
        <div className="flex justify-center py-12">
          <Atom.Loader />
        </div>
      </Molecule.TabSection>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="sm:pt-8">
        <Molecule.FeedState
          icon={<Clapperboard size={24} strokeWidth={1.5} />}
          title="No clips yet."
          description={`When people clip ${name}’s streams on Twitch, the most-watched ones show up here.`}
        />
      </div>
    );
  }

  return (
    <Molecule.TabSection title="Clips" actions={source}>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {clips.map((clip) => (
          <li key={clip.id}>
            <button
              type="button"
              onClick={() => setPlaying(clip)}
              className="group focus-ring flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-divider bg-surface text-left transition-colors hover:border-muted"
            >
              <span className="relative block aspect-video w-full bg-rail-item">
                <Image
                  src={clip.thumbnailUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                />
                <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                  {clipLength(clip.duration)}
                </span>
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Play size={18} fill="currentColor" aria-hidden />
                  </span>
                </span>
              </span>
              <span className="flex flex-col gap-1 p-3">
                <span className="line-clamp-2 text-sm font-semibold">{clip.title}</span>
                <span className="text-xs text-muted">{clipDetails(clip)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      {cursor && (
        <Atom.Button variant="secondary" loading={loadingMore} onClick={loadMore} className="self-center">
          Load more
        </Atom.Button>
      )}
      <Modal
        open={playing !== null}
        title={null}
        footer={null}
        onCancel={() => setPlaying(null)}
        width={880}
        centered
        destroyOnHidden
        closeIcon={
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors group-hover:bg-black/85">
            <X size={16} />
          </span>
        }
        classNames={{ close: "group !bg-transparent" }}
        styles={{ container: { padding: 0, overflow: "hidden" } }}
      >
        {playing && (
          <div className="flex flex-col">
            <div className="relative aspect-video bg-black">
              <iframe
                src={`https://clips.twitch.tv/embed?${new URLSearchParams({
                  clip: playing.id,
                  parent: window.location.hostname,
                  autoplay: "true",
                })}`}
                title={playing.title}
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-semibold">{playing.title}</p>
                <p className="text-xs text-muted">{clipDetails(playing)}</p>
              </div>
              <a
                href={playing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring flex shrink-0 items-center gap-1.5 rounded-sm text-[13px] font-semibold text-accent hover:underline"
              >
                Open on Twitch
                <ExternalLink size={14} aria-hidden />
              </a>
            </div>
          </div>
        )}
      </Modal>
    </Molecule.TabSection>
  );
}

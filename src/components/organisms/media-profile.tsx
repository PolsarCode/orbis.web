"use client";

import { ChevronDown, EyeOff, Globe, Lock, MoreHorizontal, SearchX, Star } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState, type UIEvent } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Template from "@template";
import {
  AdultTitleError,
  createMediaPost,
  getMediaPosts,
  getMediaProfile,
  type FeedContentType,
  type LibraryEntry,
  type MediaProfile as Profile,
} from "@/lib/api";
import { statusLabel } from "@/lib/library";
import { usePaged } from "@/lib/use-paged";
import { useAuthStore } from "@/stores/auth-store";
import { mediaTypes } from "./activity-card";
import { AddToLibraryButton, EntryMenu } from "./library-controls";
import {
  MediaCover,
  ProgressControl,
  StatusBadge,
  StatusSelect,
} from "./library-view";
import { SearchScope } from "./site-search";
import { PostComposer } from "./post-composer";
import { PostList } from "./post-list";
import { PanelHeading, SidePanel } from "./side-panel";
import { PageTour } from "./onboarding";
import { MediaLinkedDiscussion } from "./linked-discussion";
import { PersonRow } from "./person-row";

const detailLabels: Record<string, string> = {
  format: "Format",
  episodes: "Episodes",
  duration: "Duration",
  season: "Season",
  studios: "Studios",
  airedFrom: "Aired from",
  airedTo: "Aired to",
  chapters: "Chapters",
  volumes: "Volumes",
  authors: "Authors",
  publishedFrom: "Published from",
  publishedTo: "Published to",
  platforms: "Platforms",
  developers: "Developers",
  publishers: "Publishers",
  releaseDate: "Release date",
};

function formatDetail(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  if (typeof value === "string") {
    if (/^[A-Z0-9]{1,4}$/.test(value)) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replaceAll("_", " ");
  }
  return String(value);
}

const titleCase = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

function Synopsis({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 600;

  return (
    <div className="flex flex-col gap-2">
      <p
        className={`text-sm leading-relaxed whitespace-pre-line ${
          long && !expanded ? "line-clamp-6" : ""
        }`}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="focus-ring flex w-fit cursor-pointer items-center gap-1 rounded-sm text-xs font-semibold text-accent hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown size={14} className={expanded ? "rotate-180" : ""} />
        </button>
      )}
    </div>
  );
}

type Loaded = { key: string; profile: Profile | null; error?: string; adult?: boolean };

function LibraryAction({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (entry: LibraryEntry | null) => void;
}) {
  if (!profile.entry) {
    return <AddToLibraryButton media={profile} onAdded={onChange} />;
  }

  return (
    <EntryMenu
      entry={profile.entry}
      onChange={onChange}
      onRemove={() => onChange(null)}
      trigger={
        <span>
          <Atom.Button size="small" variant="secondary">
            {profile.entry.isPublic ? <Globe size={13} /> : <Lock size={13} />}
            {statusLabel(profile.entry.status, profile.type)}
          </Atom.Button>
        </span>
      }
    />
  );
}

function MediaHeader({
  profile,
  collapsed,
  onChange,
}: {
  profile: Profile;
  collapsed: boolean;
  onChange: (entry: LibraryEntry | null) => void;
}) {
  const kind = mediaTypes[profile.type];
  const backdrop = profile.bannerImage ?? profile.coverImage;

  return (
    <header
      className={`relative shrink-0 overflow-hidden border-b border-divider bg-rail-item transition-[height] duration-300 ease-out motion-reduce:transition-none ${
        collapsed ? "h-14 sm:h-[72px]" : "h-56 sm:h-72"
      }`}
    >
      {backdrop && (
        <Image
          src={backdrop}
          alt=""
          fill
          unoptimized
          priority
          className={`object-cover ${profile.bannerImage ? "" : "scale-110 blur-2xl"}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
      <div
        className={`absolute inset-0 flex gap-4 px-4 pr-40 sm:gap-5 sm:px-8 sm:pr-56 ${
          collapsed ? "items-center" : "items-end pb-5 sm:pb-6"
        }`}
      >
        <MediaCover
          src={profile.coverImage}
          className={`border-2 border-white/80 shadow-lg transition-[width] duration-300 motion-reduce:transition-none ${
            collapsed ? "w-7 sm:w-9" : "w-20 sm:w-28"
          }`}
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          {!collapsed && (
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/85">
              <span className="flex items-center gap-1">
                {kind.icon}
                {kind.label}
              </span>
              {profile.year && <span>· {profile.year}</span>}
            </p>
          )}
          <Atom.Heading
            className={`min-w-0 truncate text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] ${
              collapsed ? "" : "sm:text-4xl"
            }`}
          >
            {profile.title}
          </Atom.Heading>
        </div>
      </div>
      <div className="absolute top-2.5 right-4 flex items-center gap-1.5 rounded-lg bg-surface/85 p-1 backdrop-blur sm:top-4 sm:right-8">
        <LibraryAction profile={profile} onChange={onChange} />
      </div>
    </header>
  );
}

function MetaBar({ profile }: { profile: Profile }) {
  const entry = profile.entry;
  const unit = profile.type === "manga" ? "ch" : "ep";

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-divider px-4 py-3 text-xs sm:px-8">
      {profile.score !== null && (
        <span className="flex items-center gap-1 font-semibold">
          <Star size={13} className="fill-current text-accent" />
          {profile.score.toFixed(1)}
        </span>
      )}
      {profile.releaseStatus && (
        <span className="text-muted">{titleCase(profile.releaseStatus)}</span>
      )}
      {profile.genres.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {profile.genres.map((genre) => (
            <li key={genre} className="rounded-full bg-rail-item px-2 py-0.5 font-semibold">
              {genre}
            </li>
          ))}
        </ul>
      )}
      {entry && (
        <span className="ml-auto flex items-center gap-2 text-muted">
          <StatusBadge status={entry.status} type={profile.type} />
          {profile.type !== "game" && (
            <span>
              {entry.progress} / {entry.total ?? "?"} {unit}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function YourLibrary({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (entry: LibraryEntry | null) => void;
}) {
  const entry = profile.entry;

  return (
    <section
      data-tour="media-library"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-divider bg-surface p-5"
    >
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
        <h3 className="font-display text-xl font-bold">Your library</h3>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          {!entry ? (
            "Not in your library yet."
          ) : entry.isPublic ? (
            <>
              <Globe size={12} />
              Public. Your communities see your updates.
            </>
          ) : (
            <>
              <Lock size={12} />
              Private. Only you can see it.
            </>
          )}
        </p>
      </div>
      {entry ? (
        <>
          <StatusSelect entry={entry} onChange={onChange} />
          <ProgressControl entry={entry} onChange={onChange} />
          <EntryMenu
            entry={entry}
            onChange={onChange}
            onRemove={() => onChange(null)}
            trigger={
              <button
                type="button"
                aria-label={`Options for ${entry.title}`}
                className="icon-button cursor-pointer"
              >
                <MoreHorizontal size={16} />
              </button>
            }
          />
        </>
      ) : (
        <AddToLibraryButton media={profile} onAdded={onChange} size="middle" />
      )}
    </section>
  );
}

function MediaWall({ profile }: { profile: Profile }) {
  const feed = usePaged(
    useCallback(
      (token: string | null, cursor?: string, excluded?: FeedContentType[]) =>
        getMediaPosts(token, profile.type, profile.sourceId, cursor, excluded),
      [profile.type, profile.sourceId],
    ),
    { live: true, types: ["post"] },
  );

  async function handlePost(content: string, linkUrl?: string) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");
    feed.prepend(await createMediaPost(token, profile.type, profile.sourceId, content, linkUrl));
  }

  return (
    <section data-tour="media-wall" className="flex min-w-0 flex-col gap-3 md:col-start-1">
      <PostComposer
        linkPreview
        onPost={handlePost}
        placeholder={`Share your thoughts on ${profile.title}…`}
        target={
          <div className="flex items-center gap-3">
            <MediaCover src={profile.coverImage} className="w-8" />
            <div className="flex min-w-0 flex-col">
              <span className="text-xs text-muted uppercase">Post to</span>
              <span className="truncate text-sm font-semibold">{profile.title}</span>
            </div>
          </div>
        }
      />
      <PostList
        feed={feed}
        empty={{
          title: "No posts yet.",
          description: `Be the first to share your thoughts on ${profile.title}.`,
        }}
      />
    </section>
  );
}

function People({ profile }: { profile: Profile }) {
  return (
    <>
      <PanelHeading
        title={`In your communities / ${profile.members.length}`}
        label="People"
      />
      {profile.members.length === 0 ? (
        <p className="text-xs text-muted">
          No one in your communities has added this publicly yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {profile.members.map(({ user, status }) => (
            <PersonRow
              key={user.id}
              person={{
                userId: user.id,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
              }}
              subtitle={statusLabel(status, profile.type)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export function MediaProfile({ type, sourceId }: { type: string; sourceId: string }) {
  const key = `${type}/${sourceId}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getMediaProfile(token, type, sourceId)
      .then((profile) => setLoaded({ key, profile }))
      .catch((e: Error) =>
        setLoaded(
          e instanceof AdultTitleError
            ? { key, profile: null, adult: true }
            : { key, profile: null, error: e.message },
        ),
      );
  }, [key, type, sourceId]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const room = scrollHeight - clientHeight;
    setCollapsed((current) =>
      current ? scrollTop > 0 : scrollTop > 32 && room > 240,
    );
  }

  const current = loaded?.key === key ? loaded : null;

  if (!current || !current.profile) {
    return (
      <Template.CenteredTemplate>
        {!current ? (
          <Atom.Loader />
        ) : current.adult ? (
          <Molecule.FeedState
            eyebrow="18+"
            icon={<EyeOff size={24} strokeWidth={1.5} />}
            title="This title is 18+."
            description="Turn on Show NSFW content in Settings to see 18+ anime, manga, and games."
            action={<Atom.ButtonLink href="/settings">Open settings</Atom.ButtonLink>}
          />
        ) : (
          <Molecule.FeedState
            role={current.error ? "alert" : undefined}
            eyebrow={current.error ? "Connection error" : "Not found"}
            icon={<SearchX size={24} strokeWidth={1.5} />}
            title={current.error ? "This title couldn’t be loaded." : "We couldn’t find this title."}
            description={current.error ?? "It may have been removed from the source."}
          />
        )}
      </Template.CenteredTemplate>
    );
  }

  const profile = current.profile;
  const setEntry = (entry: LibraryEntry | null) =>
    setLoaded({ key, profile: { ...profile, entry } });
  const details = Object.entries(profile.details)
    .filter(([name]) => detailLabels[name])
    .map(([name, value]) => [detailLabels[name], formatDetail(value)] as const)
    .filter((pair): pair is readonly [string, string] => pair[1] !== null);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <SearchScope
        lead="titles"
        onAdded={(entry) => {
          if (entry.mediaType === profile.type && entry.sourceId === profile.sourceId) {
            setEntry(entry);
          }
        }}
      />
      <PageTour name="media" />
      <MediaLinkedDiscussion type={profile.type} sourceId={profile.sourceId} />
      <MediaHeader profile={profile} collapsed={collapsed} onChange={setEntry} />
      <MetaBar profile={profile} />
      <div className="flex min-h-0 flex-1">
        <Template.PageColumn onScroll={handleScroll}>
          <div className="flex flex-col gap-4">
          <YourLibrary profile={profile} onChange={setEntry} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px]">
            <section className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-5">
              <h3 className="font-display text-xl font-bold">About</h3>
              {profile.synopsis ? (
                <Synopsis text={profile.synopsis} />
              ) : (
                <p className="text-sm text-muted">No synopsis yet.</p>
              )}
              {profile.altTitles.length > 0 && (
                <p className="text-xs text-muted">
                  Also known as {profile.altTitles.slice(0, 4).join(" · ")}
                </p>
              )}
            </section>
            <section className="flex flex-col gap-3 self-start rounded-lg border border-divider bg-surface p-5 md:col-start-2 md:row-span-2 md:row-start-1">
              <h3 className="font-display text-xl font-bold">Details</h3>
              <dl className="flex flex-col gap-2.5">
                {details.map(([label, value]) => (
                  <div key={label} className="flex flex-col">
                    <dt className="text-[11px] font-bold text-muted uppercase">{label}</dt>
                    <dd className="text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <MediaWall profile={profile} />
          </div>
          </div>
        </Template.PageColumn>
        <SidePanel label="People">
          <People profile={profile} />
        </SidePanel>
      </div>
    </main>
  );
}

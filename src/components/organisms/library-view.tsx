"use client";

import { App, Dropdown, InputNumber, Segmented, Select } from "antd";
import {
  ArrowDownAZ,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlay,
  CircleX,
  Clock,
  Gamepad2,
  Library,
  LoaderCircle,
  Lock,
  Minus,
  MoreHorizontal,
  Pause,
  Plus,
  Search,
  Telescope,
  Trophy,
  Tv,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useState, type ReactElement, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Template from "@template";
import {
  addToLibrary,
  getLibrary,
  type LibraryEntry,
  type LibraryStatus,
  type MediaType,
  type SteamLink,
  updateLibraryEntry,
} from "@/lib/api";
import {
  libraryPath,
  libraryStatuses,
  mediaPath,
  mediaTypeParam,
  searchable,
  statusLabel,
} from "@/lib/library";
import { useReadOnly } from "@/lib/read-only";
import { useTabScroller } from "@/lib/use-tab-scroller";
import { useAuthStore } from "@/stores/auth-store";
import { useSearchStore } from "@/stores/search-store";
import {
  useLibraryPreferencesStore,
  type LibraryPage,
  type LibrarySort,
  type LibraryViewMode,
  type LibraryTypeFilter as TypeFilter,
  type LibraryStatusFilter as StatusFilter,
} from "@/stores/library-preferences-store";
import { mediaTypes } from "./activity-card";
import { FriendsSidePanel } from "./friends-panel";
import { LibraryCalendar } from "./library-calendar";
import { EntryMenu } from "./library-controls";
import { LibraryDiscover } from "./media-shelf";
import { PageTour } from "./onboarding";
import { SearchScope } from "./site-search";
import { WeeklyCharts } from "./weekly-charts";
import { pageTitle } from "@/lib/site-title";
import { useDocumentTitle } from "@/lib/use-document-title";

export function ProgressControl({
  entry,
  onChange,
}: {
  entry: LibraryEntry;
  onChange: (entry: LibraryEntry) => void;
}) {
  const { message } = App.useApp();
  const readOnly = useReadOnly();
  const [draft, setDraft] = useState<number | null>(entry.progress);
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(entry.progress);
  if (synced !== entry.progress) {
    setSynced(entry.progress);
    setDraft(entry.progress);
  }

  if (entry.mediaType === "game") return null;

  const unit = entry.mediaType === "manga" ? "chapters" : "episodes";
  const max = entry.total ?? undefined;

  async function save(value: number) {
    const next = Math.max(0, max === undefined ? value : Math.min(value, max));
    if (next === entry.progress) {
      setDraft(entry.progress);
      return;
    }
    const { token } = useAuthStore.getState();
    if (!token) return;
    setSaving(true);
    try {
      onChange(await updateLibraryEntry(token, entry.id, { progress: next }));
    } catch (e) {
      setDraft(entry.progress);
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1" aria-label={`Progress in ${unit}`}>
      <button
        type="button"
        aria-label={`One fewer ${unit.slice(0, -1)}`}
        disabled={readOnly || saving || entry.progress <= 0}
        onClick={() => save(entry.progress - 1)}
        className="icon-button cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={14} />
      </button>
      <InputNumber
        size="small"
        min={0}
        max={max}
        value={draft}
        disabled={readOnly || saving}
        controls={false}
        aria-label={`${unit} done`}
        onChange={setDraft}
        onPressEnter={() => draft !== null && save(draft)}
        onBlur={() => (draft !== null ? save(draft) : setDraft(entry.progress))}
        className="w-14 text-center"
      />
      <span className="w-10 text-xs text-muted">/ {entry.total ?? "?"}</span>
      <button
        type="button"
        aria-label={`One more ${unit.slice(0, -1)}`}
        disabled={readOnly || saving || (max !== undefined && entry.progress >= max)}
        onClick={() => save(entry.progress + 1)}
        className="icon-button cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export function StatusSelect({
  entry,
  onChange,
}: {
  entry: LibraryEntry;
  onChange: (entry: LibraryEntry) => void;
}) {
  const { message } = App.useApp();
  const readOnly = useReadOnly();

  async function change(status: LibraryStatus) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    try {
      onChange(await updateLibraryEntry(token, entry.id, { status }));
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Select<LibraryStatus>
      size="small"
      aria-label={`Status of ${entry.title}`}
      value={entry.status}
      disabled={readOnly}
      onChange={change}
      popupMatchSelectWidth={false}
      className="w-36"
      options={libraryStatuses.map((value) => ({
        value,
        label: statusLabel(value, entry.mediaType),
      }))}
    />
  );
}

function ListView({
  entries,
  onChange,
  onRemove,
}: {
  entries: LibraryEntry[];
  onChange: (entry: LibraryEntry) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-divider">
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry}>
          <ProgressStepper entry={entry} onChange={onChange} className="w-32 bg-rail-item" />
          <StatusSelect entry={entry} onChange={onChange} />
          <EntryMenu
            entry={entry}
            onChange={onChange}
            onRemove={onRemove}
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
        </EntryRow>
      ))}
    </ul>
  );
}

const statusIcons = {
  all: Library,
  current: CirclePlay,
  completed: Check,
  on_hold: Pause,
  dropped: CircleX,
  planned: Bookmark,
} satisfies Record<StatusFilter, typeof Library>;

const statusTones = {
  current: "info",
  completed: "success",
  on_hold: "warning",
  dropped: "neutral",
  planned: "special",
} as const satisfies Record<LibraryStatus, Atom.PillTone>;

function StatusMenu({
  action,
  type,
  current,
  pending,
  onPick,
  children,
}: {
  action: string;
  type?: MediaType;
  current?: LibraryStatus;
  pending: boolean;
  onPick: (status: LibraryStatus) => void;
  children: ReactElement;
}) {
  return (
    <Molecule.ReadOnlyGate action={action}>
      <Dropdown
        disabled={pending}
        trigger={["click"]}
        menu={{
          items: libraryStatuses.map((status) => {
            const StatusIcon = statusIcons[status];
            return {
              key: status,
              label: statusLabel(status, type),
              icon: <StatusIcon size={14} />,
              extra: status === current ? <Check size={14} /> : undefined,
            };
          }),
          onClick: ({ key }) => onPick(key as LibraryStatus),
        }}
      >
        {children}
      </Dropdown>
    </Molecule.ReadOnlyGate>
  );
}

function StatusPillFace({
  tone,
  icon,
  label,
  pending,
}: {
  tone?: Atom.PillTone;
  icon: ReactNode;
  label: string;
  pending: boolean;
}) {
  return (
    <Atom.Pill tone={tone} className="h-7 w-full! justify-between px-3 pointer-coarse:h-9">
      <span className="flex min-w-0 items-center gap-1.5">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {pending ? (
        <LoaderCircle size={13} aria-hidden className="shrink-0 animate-spin" />
      ) : (
        <ChevronDown size={13} aria-hidden className="shrink-0" />
      )}
    </Atom.Pill>
  );
}

export function AddStatusPill({
  media,
  onAdded,
}: {
  media: { type: MediaType; sourceId: string; title: string };
  onAdded: (entry: LibraryEntry) => void;
}) {
  const { message } = App.useApp();
  const [pending, setPending] = useState<LibraryStatus | null>(null);
  const PendingIcon = pending && statusIcons[pending];

  async function add(status: LibraryStatus) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(status);
    try {
      const entry = await addToLibrary(token, {
        type: media.type,
        sourceId: media.sourceId,
        status,
        isPublic: true,
        ...(media.type !== "game" && { progress: 0 }),
      });
      onAdded(entry);
      message.success(`Added ${media.title} to your library.`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  return (
    <StatusMenu
      action="add to your library"
      type={media.type}
      pending={pending !== null}
      onPick={add}
    >
      <button
        type="button"
        aria-label={
          pending ? `Adding ${media.title} to your library` : `Add ${media.title} to your library`
        }
        aria-busy={pending !== null}
        className="focus-ring w-full cursor-pointer rounded-full disabled:cursor-not-allowed aria-busy:cursor-progress"
      >
        <StatusPillFace
          tone={pending ? statusTones[pending] : undefined}
          icon={
            PendingIcon ? (
              <PendingIcon size={13} aria-hidden className="shrink-0" />
            ) : (
              <Plus size={13} aria-hidden className="shrink-0" />
            )
          }
          label={pending ? statusLabel(pending, media.type) : "Add"}
          pending={pending !== null}
        />
      </button>
    </StatusMenu>
  );
}

export function StatusPill({
  entry,
  onChange,
}: {
  entry: Pick<LibraryEntry, "id" | "status" | "mediaType" | "title">;
  onChange: (entry: LibraryEntry) => void;
}) {
  const { message } = App.useApp();
  const [pending, setPending] = useState<LibraryStatus | null>(null);
  const shown = pending ?? entry.status;
  const label = statusLabel(shown, entry.mediaType);
  const Icon = statusIcons[shown];

  async function change(status: LibraryStatus) {
    const { token } = useAuthStore.getState();
    if (!token || status === entry.status) return;
    setPending(status);
    try {
      onChange(await updateLibraryEntry(token, entry.id, { status }));
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  return (
    <StatusMenu
      action="change your library"
      type={entry.mediaType}
      current={entry.status}
      pending={pending !== null}
      onPick={change}
    >
      <button
        type="button"
        aria-label={
          pending ? `Saving ${entry.title} as ${label}` : `${label}. Change status of ${entry.title}`
        }
        aria-busy={pending !== null}
        className="focus-ring w-full cursor-pointer rounded-full aria-busy:cursor-progress"
      >
        <StatusPillFace
          tone={statusTones[shown]}
          icon={<Icon size={13} aria-hidden className="shrink-0" />}
          label={label}
          pending={pending !== null}
        />
      </button>
    </StatusMenu>
  );
}

function ProgressStepper({
  entry,
  onChange,
  className = "",
}: {
  entry: LibraryEntry;
  onChange: (entry: LibraryEntry) => void;
  className?: string;
}) {
  const { message } = App.useApp();
  const readOnly = useReadOnly();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | null>(entry.progress);
  const [saving, setSaving] = useState(false);

  if (entry.mediaType === "game") return null;

  const unit = entry.mediaType === "manga" ? "chapter" : "episode";
  const max = entry.total ?? undefined;
  const finished = max !== undefined && entry.progress >= max;

  async function save(value: number) {
    setEditing(false);
    const next = Math.max(0, max === undefined ? value : Math.min(value, max));
    const { token } = useAuthStore.getState();
    if (!token || next === entry.progress) return;
    setSaving(true);
    try {
      onChange(await updateLibraryEntry(token, entry.id, { progress: next }));
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      aria-label={`Progress in ${unit}s`}
      className={`flex h-7 items-center justify-between rounded-full text-foreground pointer-coarse:h-9 ${className}`}
    >
      <button
        type="button"
        aria-label={`One fewer ${unit}`}
        disabled={readOnly || saving || entry.progress <= 0}
        onClick={() => save(entry.progress - 1)}
        className="focus-ring flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:h-9 pointer-coarse:w-9"
      >
        <ChevronDown size={15} />
      </button>
      {editing ? (
        <InputNumber
          size="small"
          autoFocus
          min={0}
          max={max}
          value={draft}
          controls={false}
          aria-label={`${unit}s done`}
          onChange={setDraft}
          onPressEnter={() => draft !== null && save(draft)}
          onBlur={() => (draft !== null ? save(draft) : setEditing(false))}
          className="w-14"
        />
      ) : (
        <button
          type="button"
          aria-label={`${entry.progress} of ${entry.total ?? "unknown"} ${unit}s. Type a number`}
          disabled={readOnly}
          onClick={() => {
            setDraft(entry.progress);
            setEditing(true);
          }}
          className="focus-ring min-w-0 cursor-text truncate rounded-sm px-1 text-[11px] font-semibold whitespace-nowrap disabled:cursor-default"
        >
          {entry.progress} / {entry.total ?? "?"}
        </button>
      )}
      <button
        type="button"
        aria-label={`One more ${unit}`}
        disabled={readOnly || saving || finished}
        onClick={() => save(entry.progress + 1)}
        className="focus-ring flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:h-9 pointer-coarse:w-9"
      >
        <ChevronUp size={15} />
      </button>
    </div>
  );
}

type CardEntry = Pick<
  LibraryEntry,
  "mediaType" | "sourceId" | "title" | "coverImage" | "status" | "progress" | "total"
> & {
  isPublic?: boolean;
  steam?: SteamLink | null;
};

function CardLayout({
  entry,
  progress,
  status,
  menu,
  className = "",
}: {
  entry: CardEntry;
  progress: ReactNode;
  status: ReactNode;
  menu?: ReactNode;
  className?: string;
}) {
  const menuWithProgress = Boolean(progress) && entry.mediaType !== "game";

  return (
    <div className={`@container relative overflow-hidden rounded-md ${className}`}>
      <Link
        href={mediaPath(entry.mediaType, entry.sourceId)}
        aria-label={entry.title}
        className="focus-ring block rounded-md"
      >
        <MediaCover src={entry.coverImage} className="w-full" />
      </Link>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 bg-gradient-to-b from-black/85 via-black/50 to-transparent p-2 pb-8">
        <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-semibold text-white">
          {entry.isPublic === false && (
            <Lock
              size={12}
              aria-label="Private"
              className="pointer-events-auto mr-1 inline-block align-[-1px]"
            />
          )}
          {entry.title}
        </span>
        {menu && (
          <div className="pointer-events-auto hidden shrink-0 pointer-coarse:@max-[11rem]:block">
            {menu}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 pt-8">
        {progress && (
          <div className="flex items-center gap-1">
            <div className="pointer-events-auto min-w-0 flex-1">{progress}</div>
            {menu && menuWithProgress && (
              <div className="pointer-events-auto shrink-0 pointer-coarse:@max-[11rem]:hidden">
                {menu}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="pointer-events-auto min-w-0 flex-1">{status}</div>
          {!menuWithProgress && menu && (
            <div className="pointer-events-auto shrink-0 pointer-coarse:@max-[11rem]:hidden">
              {menu}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryRow({ entry, children }: { entry: CardEntry; children: ReactNode }) {
  const href = mediaPath(entry.mediaType, entry.sourceId);

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3 first:pt-0 last:pb-0">
      <Link href={href} className="focus-ring rounded-md">
        <MediaCover src={entry.coverImage} className="w-10" square />
      </Link>
      <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
        <Link
          href={href}
          className="focus-ring truncate rounded-sm text-sm font-semibold hover:underline"
        >
          {entry.title}
        </Link>
        <span className="flex items-center gap-2 text-xs text-muted">
          <span className="flex items-center gap-1">
            {mediaTypes[entry.mediaType].icon}
            {mediaTypes[entry.mediaType].label}
          </span>
          {entry.isPublic === false && (
            <span className="flex items-center gap-1">
              <Lock size={12} />
              Private
            </span>
          )}
          {entry.steam && <Molecule.SteamBadge steam={entry.steam} title={entry.title} />}
        </span>
      </div>
      {children}
    </li>
  );
}

function steamHours(entry: CardEntry) {
  if (!entry.steam) return null;
  return (
    <div className="flex items-center gap-1">
      <Molecule.SteamHours steam={entry.steam} title={entry.title} className="min-w-0 flex-1" />
      <Molecule.SteamAchievements steam={entry.steam} title={entry.title} className="shrink-0" />
    </div>
  );
}

export function LibraryCard({
  entry,
  onChange,
  onRemove,
  className = "",
}: {
  entry: LibraryEntry;
  onChange: (entry: LibraryEntry) => void;
  onRemove: (id: number) => void;
  className?: string;
}) {
  const readOnly = useReadOnly();
  if (readOnly) return <ReadOnlyLibraryCard entry={entry} className={className} />;

  return (
    <CardLayout
      entry={entry}
      className={className}
      progress={
        entry.mediaType === "game" ? (
          steamHours(entry)
        ) : (
          <ProgressStepper entry={entry} onChange={onChange} className="bg-surface/90 shadow-sm" />
        )
      }
      status={<StatusPill entry={entry} onChange={onChange} />}
      menu={<EntryMenu entry={entry} onChange={onChange} onRemove={onRemove} />}
    />
  );
}

function readOnlyProgress(entry: CardEntry) {
  if (entry.mediaType === "game") return steamHours(entry);
  const unit = entry.mediaType === "manga" ? "chapters" : "episodes";

  return (
    <span
      aria-label={`${entry.progress} of ${entry.total ?? "unknown"} ${unit}`}
      className="flex h-7 items-center justify-center rounded-full bg-surface/90 px-2 text-[11px] font-semibold whitespace-nowrap text-foreground shadow-sm pointer-coarse:h-9"
    >
      {entry.progress} / {entry.total ?? "?"}
    </span>
  );
}

function ReadOnlyStatus({ entry, className = "" }: { entry: CardEntry; className?: string }) {
  const Icon = statusIcons[entry.status];

  return (
    <Atom.Pill tone={statusTones[entry.status]} className={`h-7 px-3 pointer-coarse:h-9 ${className}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon size={13} aria-hidden className="shrink-0" />
        <span className="truncate">{statusLabel(entry.status, entry.mediaType)}</span>
      </span>
    </Atom.Pill>
  );
}

export function ReadOnlyLibraryCard({
  entry,
  className = "",
}: {
  entry: CardEntry;
  className?: string;
}) {
  return (
    <CardLayout
      entry={entry}
      className={className}
      progress={readOnlyProgress(entry)}
      status={<ReadOnlyStatus entry={entry} className="w-full!" />}
    />
  );
}

const cardGrid =
  "grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3 sm:grid-cols-3 md:grid-cols-4";
const listBox = "rounded-lg border border-divider bg-surface py-5";

export function ReadOnlyLibraryEntries({
  entries,
  view,
}: {
  entries: (CardEntry & { id: number })[];
  view: LibraryViewMode;
}) {
  return view === "list" ? (
    <section className={listBox}>
      <ul className="flex flex-col divide-y divide-divider">
        {entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry}>
            {readOnlyProgress(entry)}
            <ReadOnlyStatus entry={entry} />
          </EntryRow>
        ))}
      </ul>
    </section>
  ) : (
    <ul className={cardGrid}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <ReadOnlyLibraryCard entry={entry} />
        </li>
      ))}
    </ul>
  );
}

const SEARCH_SUGGESTIONS = ["Frieren", "One Piece", "Chainsaw Man", "Stardew Valley", "Berserk"];

const emptyCopy = {
  all: {
    title: "Nothing here yet.",
    description: "There’s nothing of this type in your library yet. Search for a title to add it.",
  },
  current: {
    title: "Nothing in progress.",
    description: "Start something from your plan list, or find something new to dive into.",
  },
  completed: {
    title: "Nothing finished yet.",
    description: "Everything you complete lands here, so you can look back on it.",
  },
  on_hold: {
    title: "Nothing on hold.",
    description: "Pause a title to park it here until you’re ready to pick it back up.",
  },
  dropped: {
    title: "Nothing dropped.",
    description: "Titles you stop watching, reading, or playing end up here.",
  },
  planned: {
    title: "Nothing planned.",
    description: "Save titles you want to get to next, and they’ll wait for you here.",
  },
} satisfies Record<StatusFilter, { title: string; description: string }>;

export function searchTitles(query?: string) {
  useSearchStore.getState().openSearch({ query, filter: "titles" });
}

export function LibraryEmptyState({
  entries,
  onSearch,
  onSuggest,
  compact = false,
}: {
  entries: LibraryEntry[];
  onSearch: () => void;
  onSuggest?: (query: string) => void;
  compact?: boolean;
}) {
  const status = useLibraryPreferencesStore((state) => state.status);
  const type = useLibraryPreferencesStore((state) => state.type);
  const setStatus = useLibraryPreferencesStore((state) => state.setStatus);
  const empty = entries.length === 0;
  const planned = filterLibrary(entries, type, "planned").length;
  const { title, description } = empty
    ? {
        title: "Your library is empty.",
        description:
          "Track the anime, manga, and games you love, and share your progress with your communities. Search for a title to add it.",
      }
    : emptyCopy[status];
  const Icon = statusIcons[empty ? "all" : status];

  return (
    <div
      className={`flex flex-col items-center gap-3 text-center ${compact ? "m-auto px-4" : "py-8"}`}
    >
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-rail-item text-muted"
      >
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <h3 className={`font-display font-bold ${compact ? "text-xl" : "text-2xl"}`}>{title}</h3>
      <p className="max-w-sm text-[13px] text-muted">{description}</p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Atom.Button size="small" icon={<Search size={14} />} onClick={onSearch}>
          Search titles
        </Atom.Button>
        {status === "current" && planned > 0 && (
          <Atom.Button size="small" variant="secondary" onClick={() => setStatus("planned")}>
            Pick from your plan list · {planned}
          </Atom.Button>
        )}
      </div>
      {empty && onSuggest && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-xs text-muted">Try</span>
          {SEARCH_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggest(suggestion)}
              className="focus-ring cursor-pointer rounded-full border border-divider px-2.5 py-1 text-xs font-semibold transition-colors hover:border-accent hover:text-accent"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function filterLibrary<T extends { mediaType: MediaType; status: LibraryStatus }>(
  entries: T[],
  type: TypeFilter,
  status: StatusFilter,
): T[] {
  return entries.filter(
    (entry) =>
      (type === "all" || entry.mediaType === type) &&
      (status === "all" || entry.status === status),
  );
}

export function MediaCover({
  src,
  className = "",
  square = false,
}: {
  src: string | null;
  className?: string;
  square?: boolean;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md border border-divider bg-rail-item ${
        square ? "aspect-square" : "aspect-[2/3]"
      } ${className}`}
    >
      {src && <Image src={src} alt="" fill unoptimized className="object-cover" />}
    </div>
  );
}

export function StatusBadge({
  status,
  type,
}: {
  status: LibraryStatus;
  type?: MediaType;
}) {
  return <Atom.Pill tone={statusTones[status]}>{statusLabel(status, type)}</Atom.Pill>;
}

function ViewToggle() {
  const view = useLibraryPreferencesStore((state) => state.view);
  const setView = useLibraryPreferencesStore((state) => state.setView);

  return (
    <Molecule.ViewToggle
      label="Library view"
      options={Molecule.cardListViews}
      view={view}
      onChange={setView}
    />
  );
}

function iconLabel(icon: ReactNode, label: string, compact: boolean) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      <span className={compact ? "hidden sm:inline" : undefined}>{label}</span>
    </span>
  );
}

export function typeLabel(value: TypeFilter, compact = false) {
  return iconLabel(
    value === "all" ? <Library size={12} /> : mediaTypes[value].icon,
    value === "all" ? "All types" : value === "game" ? "Games" : mediaTypes[value].label,
    compact,
  );
}

const mediaTypeValues: MediaType[] = ["anime", "manga", "game"];

function TypeSelect({
  value,
  onChange,
  types = mediaTypeValues,
  size = "small",
}: {
  value: TypeFilter;
  onChange: (type: TypeFilter) => void;
  types?: MediaType[];
  size?: "small" | "middle";
}) {
  return (
    <Select<TypeFilter>
      size={size}
      aria-label="Media type"
      value={value}
      onChange={onChange}
      popupMatchSelectWidth={false}
      className="w-16 sm:w-32"
      labelRender={({ value }) => typeLabel(value as TypeFilter, true)}
      options={(["all", ...types] as TypeFilter[]).map((type) => ({
        value: type,
        label: typeLabel(type),
      }))}
    />
  );
}

const librarySorts: { value: LibrarySort; label: string; icon: ReactNode }[] = [
  { value: "updated", label: "Recently updated", icon: <Clock size={12} /> },
  { value: "title", label: "Title A–Z", icon: <ArrowDownAZ size={12} /> },
  { value: "year", label: "Newest release", icon: <CalendarDays size={12} /> },
];

function sortLabel(value: LibrarySort, compact = false) {
  const sort = librarySorts.find((option) => option.value === value) ?? librarySorts[0];
  return iconLabel(sort.icon, sort.label, compact);
}

export function sortEntries<T extends { title: string; year?: number | null }>(
  entries: T[],
  sort: LibrarySort,
): T[] {
  if (sort === "updated") return entries;
  return [...entries].sort((a, b) => {
    if (sort === "year" && (a.year ?? null) !== (b.year ?? null)) {
      if (a.year == null) return 1;
      if (b.year == null) return -1;
      return b.year - a.year;
    }
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true });
  });
}

function statusTabs(
  entries: { mediaType: MediaType; status: LibraryStatus }[] | null,
  type: TypeFilter,
) {
  const ofType = (entries ?? []).filter((entry) => type === "all" || entry.mediaType === type);
  const typeForLabels = type === "all" ? undefined : type;

  return (["all", ...libraryStatuses] as StatusFilter[]).map((value) => ({
    value,
    Icon: statusIcons[value],
    label: value === "all" ? "All" : statusLabel(value, typeForLabels),
    count:
      value === "all" ? ofType.length : ofType.filter((entry) => entry.status === value).length,
  }));
}

export function LibraryTabs({
  entries,
  bordered = true,
}: {
  entries: LibraryEntry[] | null;
  bordered?: boolean;
}) {
  const status = useLibraryPreferencesStore((state) => state.status);
  const type = useLibraryPreferencesStore((state) => state.type);
  const setStatus = useLibraryPreferencesStore((state) => state.setStatus);
  const setType = useLibraryPreferencesStore((state) => state.setType);
  const tabs = statusTabs(entries, type);
  const [tabsRef, tabsFade] = useTabScroller<HTMLDivElement>(status);

  return (
    <nav
      aria-label="Library sections"
      className={`flex shrink-0 items-end gap-6 px-4 max-sm:flex-wrap max-sm:gap-y-0 sm:px-8 ${bordered ? "border-b border-divider" : ""}`}
    >
      <div
        ref={tabsRef}
        style={tabsFade}
        data-tour="library-tabs"
        className="-mb-px flex min-w-0 items-end gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
      >
        {tabs.map(({ value, Icon, label, count }) => {
          const active = status === value;
          return (
            <Atom.TabButton
              key={value}
              active={active}
              aria-pressed={active}
              onClick={() => setStatus(value)}
            >
              <Icon size={16} aria-hidden />
              {label}
              {entries && <span className="text-xs font-normal text-muted">{count}</span>}
            </Atom.TabButton>
          );
        })}
      </div>
      <div
        data-tour="library-view"
        className="ml-auto flex shrink-0 items-center gap-2 self-center max-sm:order-first max-sm:ml-0 max-sm:w-full max-sm:pt-3"
      >
        <TypeSelect value={type} onChange={setType} />
      </div>
    </nav>
  );
}

export function LibraryStatusSwitch({
  entries,
  type,
  status,
  onChange,
}: {
  entries: { mediaType: MediaType; status: LibraryStatus }[] | null;
  type: TypeFilter;
  status: StatusFilter;
  onChange: (status: StatusFilter) => void;
}) {
  const tabs = statusTabs(entries, type);
  const [tabsRef, tabsFade] = useTabScroller<HTMLDivElement>(status);

  return (
    <div
      ref={tabsRef}
      style={{ ...tabsFade, scrollbarWidth: "none" }}
      data-tour="library-tabs"
      className="overflow-x-auto"
    >
      <Segmented<StatusFilter>
        block
        aria-label="Library sections"
        className="w-max! min-w-full [&_.ant-segmented-item]:flex-[1_0_auto]"
        value={status}
        onChange={onChange}
        options={tabs.map(({ value, Icon, label, count }) => ({
          value,
          icon: <Icon size={16} aria-hidden />,
          label: (
            <span className="inline-flex items-center gap-1.5">
              {label}
              {entries && <span className="text-xs text-muted">{count}</span>}
            </span>
          ),
        }))}
      />
    </div>
  );
}

export function LibraryToolbar({
  query,
  onQuery,
  type,
  onType,
  types,
  sort,
  onSort,
  children,
}: {
  query: string;
  onQuery: (query: string) => void;
  type: TypeFilter;
  onType: (type: TypeFilter) => void;
  types?: MediaType[];
  sort: LibrarySort;
  onSort: (sort: LibrarySort) => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Atom.Input
        allowClear
        aria-label="Search titles"
        placeholder="Search titles"
        prefix={<Search size={14} className="text-muted" />}
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        className="w-full! sm:w-auto! sm:min-w-48 sm:flex-1"
      />
      <div
        data-tour="library-view"
        className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2"
      >
        <TypeSelect value={type} onChange={onType} types={types} size="middle" />
        <Select<LibrarySort>
          aria-label="Sort by"
          value={sort}
          onChange={onSort}
          popupMatchSelectWidth={false}
          className="w-16 sm:w-44"
          labelRender={({ value }) => sortLabel(value as LibrarySort, true)}
          options={librarySorts.map(({ value }) => ({ value, label: sortLabel(value) }))}
        />
        {children}
        <ViewToggle />
      </div>
    </div>
  );
}

const typeOptions: { value: MediaType; label: string; icon: ReactNode }[] = [
  { value: "anime", label: "Anime", icon: <Tv size={16} /> },
  { value: "manga", label: "Manga", icon: <BookOpen size={16} /> },
  { value: "game", label: "Games", icon: <Gamepad2 size={16} /> },
];

function MediaTypeSwitch({ page, type }: { page: "charts" | "discover"; type: MediaType }) {
  const router = useRouter();

  return (
    <Segmented<MediaType>
      block
      aria-label={page === "charts" ? "Chart types" : "Discover types"}
      value={type}
      onChange={(value) => router.push(libraryPath(page, value))}
      options={typeOptions}
    />
  );
}

function LibraryShelf({
  entries,
  shown,
  query,
  onChange,
  onRemove,
  onSuggest,
}: {
  entries: LibraryEntry[];
  shown: LibraryEntry[];
  query: string;
  onChange: (entry: LibraryEntry) => void;
  onRemove: (id: number) => void;
  onSuggest: (query: string) => void;
}) {
  const view = useLibraryPreferencesStore((state) => state.view);
  const search = query.trim();
  const boxed = shown.length === 0 || view === "list";

  return (
    <section
      className={`flex flex-col gap-4 ${
        boxed ? `rounded-lg border border-divider bg-surface ${shown.length > 0 ? "py-5" : "p-5"}` : ""
      }`}
    >
      {shown.length === 0 && search ? (
        <p className="text-sm text-muted">No titles in your library match “{search}”.</p>
      ) : shown.length === 0 ? (
        <LibraryEmptyState
          entries={entries}
          onSearch={() => searchTitles()}
          onSuggest={onSuggest}
        />
      ) : view === "list" ? (
        <ListView entries={shown} onChange={onChange} onRemove={onRemove} />
      ) : (
        <ul className={cardGrid}>
          {shown.map((entry) => (
            <li key={entry.id}>
              <LibraryCard entry={entry} onChange={onChange} onRemove={onRemove} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const libraryPages: { value: LibraryPage; label: string; icon: ReactNode }[] = [
  { value: "discover", label: "Discover", icon: <Telescope size={16} /> },
  { value: "mine", label: "My library", icon: <Library size={16} /> },
  { value: "calendar", label: "Calendar", icon: <CalendarDays size={16} /> },
  { value: "charts", label: "Charts", icon: <Trophy size={16} /> },
];

function pageHref(page: LibraryPage, type: MediaType) {
  return page === "mine" || page === "calendar" ? `/library?tab=${page}` : libraryPath(page, type);
}

function LibraryPages({ page, type }: { page: LibraryPage | null; type: MediaType }) {
  return (
    <nav
      aria-label="Catalog pages"
      data-tour="library-pages"
      className="hidden shrink-0 items-end gap-6 overflow-x-auto border-b border-divider px-4 authenticated:flex sm:px-8"
    >
      {libraryPages.map(({ value, label, icon }) => (
        <Atom.TabLink
          key={value}
          href={pageHref(value, type)}
          active={page === value}
          className="-mb-px"
        >
          {icon}
          {label}
        </Atom.TabLink>
      ))}
    </nav>
  );
}

export function LibraryView() {
  useDocumentTitle(pageTitle("Catalog"));
  const params = useSearchParams();
  const router = useRouter();
  const page = libraryPages.find(({ value }) => value === params.get("tab"))?.value ?? null;
  const mine = page === "mine";
  const type = mediaTypeParam(params.get("type"));
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const status = useLibraryPreferencesStore((state) => state.status);
  const filterType = useLibraryPreferencesStore((state) => state.type);
  const sort = useLibraryPreferencesStore((state) => state.sort);
  const setStatus = useLibraryPreferencesStore((state) => state.setStatus);
  const setFilterType = useLibraryPreferencesStore((state) => state.setType);
  const setSort = useLibraryPreferencesStore((state) => state.setSort);
  const search = searchable(query.trim());
  const searched =
    entries && entries.filter((entry) => !search || searchable(entry.title).includes(search));
  const shown = searched && sortEntries(filterLibrary(searched, filterType, status), sort);

  useEffect(() => {
    let active = true;
    Promise.resolve(useLibraryPreferencesStore.persist.rehydrate()).then(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    const { persist, getState } = useLibraryPreferencesStore;
    if (!persist.hasHydrated()) void persist.rehydrate();
    getState().setPage(page ?? "discover");
  }, [page]);

  useEffect(() => {
    if (!hydrated) return;
    if (!page || ((page === "mine" || page === "calendar") && !signedIn)) router.replace(pageHref("discover", type));
  }, [hydrated, page, router, type, signedIn]);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!mine || !token) return;
    getLibrary(token)
      .then((found) => {
        setEntries(found);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [mine]);

  const replace = (entry: LibraryEntry) =>
    setEntries((current) => current?.map((item) => (item.id === entry.id ? entry : item)) ?? null);

  return (
    <>
      <PageTour name="library" />
      <SearchScope
        lead="titles"
        onAdded={(entry) => setEntries((current) => current && [entry, ...current])}
      />
      <LibraryPages page={page} type={type} />
      <div className="flex min-h-0 flex-1">
        <Template.PageColumn>
          {!page ? null : page === "calendar" ? (
            signedIn && <LibraryCalendar />
          ) : page !== "mine" ? (
            <div className="flex flex-col gap-6">
              <MediaTypeSwitch page={page} type={type} />
              {page === "charts" ? <WeeklyCharts /> : <LibraryDiscover />}
            </div>
          ) : !signedIn ? null : (
            <div className="flex flex-col gap-4">
              <LibraryToolbar
                query={query}
                onQuery={setQuery}
                type={filterType}
                onType={setFilterType}
                sort={sort}
                onSort={setSort}
              />
              <LibraryStatusSwitch
                entries={searched}
                type={filterType}
                status={status}
                onChange={setStatus}
              />
              {failed ? (
                <Atom.ErrorMessage>Could not load your library.</Atom.ErrorMessage>
              ) : !entries || !shown ? (
                <Molecule.FeedSkeleton label="Loading your library…" />
              ) : (
                <LibraryShelf
                  entries={entries}
                  shown={shown}
                  query={query}
                  onSuggest={searchTitles}
                  onChange={replace}
                  onRemove={(id) =>
                    setEntries((current) => current?.filter((item) => item.id !== id) ?? null)
                  }
                />
              )}
            </div>
          )}
        </Template.PageColumn>
        {signedIn && <FriendsSidePanel />}
      </div>
    </>
  );
}

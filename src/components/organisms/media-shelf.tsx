"use client";

import { Segmented } from "antd";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import {
  getMediaList,
  type LibraryEntry,
  type MediaListItem,
  type MediaListName,
  type MediaType,
} from "@/lib/api";
import { mediaPath } from "@/lib/library";
import { useAuthStore } from "@/stores/auth-store";
import { useMediaShelfStore } from "@/stores/media-shelf-store";
import { mediaTypes } from "./activity-card";
import { AddStatusPill, MediaCover, StatusPill } from "./library-view";

const types: MediaType[] = ["anime", "manga", "game"];
const lists: MediaListName[] = ["trending", "season", "top", "upcoming"];
const ranked: MediaListName[] = ["trending", "top"];
const listIcons: Record<MediaListName, LucideIcon> = {
  trending: Flame,
  season: Sparkles,
  top: Trophy,
  upcoming: CalendarClock,
};
const ROW_SIZE = 6;
const SECTION_SIZE = 6;
const SECTION_SIZE_ON_PHONES = 3;
const sectionTitles: Record<MediaType, string> = { anime: "Anime", manga: "Manga", game: "Games" };

function listLabel(list: MediaListName, type: MediaType | null) {
  if (list === "season") {
    return type ? { anime: "This season", manga: "New series", game: "New releases" }[type] : "New";
  }
  return { trending: "Trending", top: "Top rated", upcoming: "Coming soon" }[list];
}

function countLabel(item: MediaListItem) {
  const { episodes, chapters } = item.details;
  if (item.type === "anime" && typeof episodes === "number") return `${episodes} eps`;
  if (item.type === "manga" && typeof chapters === "number") return `${chapters} ch`;
  return item.year ? String(item.year) : "TBA";
}

type SavedEntry = MediaListItem["entry"];

function saved(entry: LibraryEntry): SavedEntry {
  return { id: entry.id, status: entry.status, isPublic: entry.isPublic };
}

function ShelfCard({
  item,
  rank,
  onEntry,
}: {
  item: MediaListItem;
  rank: number | null;
  onEntry?: (entry: SavedEntry) => void;
}) {
  const entry = item.entry && { ...item.entry, mediaType: item.type, title: item.title };

  return (
    <div className="relative overflow-hidden rounded-md">
      <Link
        href={mediaPath(item.type, item.sourceId)}
        aria-label={item.entry ? `${item.title}, in your library` : item.title}
        className="focus-ring block rounded-md"
      >
        <MediaCover src={item.coverImage} className="w-full" />
        <span className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/85 via-black/50 to-transparent p-2 pb-8">
          <span className="line-clamp-2 text-sm leading-snug font-semibold text-white">
            {item.title}
          </span>
        </span>
      </Link>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 via-black/60 to-transparent p-2 pt-8">
        <span className="flex items-center gap-2 text-xs font-medium text-white">
          {rank !== null && <span className="font-display text-base font-bold">#{rank}</span>}
          {item.score !== null && (
            <span className="flex items-center gap-0.5">
              <Star size={11} aria-hidden className="fill-current text-warning" />
              {item.score.toFixed(1)}
            </span>
          )}
          <span className="truncate text-white/80">{countLabel(item)}</span>
          {item.entry && !onEntry && (
            <Check size={14} aria-hidden className="ml-auto shrink-0 text-online" />
          )}
        </span>
        {onEntry && (
          <div className="pointer-events-auto">
            {entry ? (
              <StatusPill entry={entry} onChange={(changed) => onEntry(saved(changed))} />
            ) : (
              <AddStatusPill media={item} onAdded={(added) => onEntry(saved(added))} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ShelfItems({
  items,
  list,
  grid,
  cardClassName,
  onEntry,
  rowRef,
}: {
  items: MediaListItem[] | null | undefined;
  list: MediaListName;
  grid: boolean;
  cardClassName: string;
  onEntry?: (id: string, entry: SavedEntry) => void;
  rowRef?: Ref<HTMLUListElement>;
}) {
  if (items === null) {
    return <p className="py-6 text-sm text-muted">This list isn’t available right now.</p>;
  }

  const size = grid ? SECTION_SIZE : ROW_SIZE;
  const shown = items && (grid ? items.slice(0, SECTION_SIZE) : items);
  const cell = (index: number) =>
    grid
      ? index >= SECTION_SIZE_ON_PHONES
        ? "max-sm:hidden"
        : ""
      : `shrink-0 snap-start ${cardClassName}`;

  return (
    <ul
      ref={rowRef}
      aria-busy={shown === undefined}
      className={
        grid
          ? "grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4"
          : "flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]"
      }
    >
      {shown === undefined
        ? Array.from({ length: size }, (_, index) => (
            <li key={index} className={cell(index)}>
              <span className="block aspect-[2/3] animate-pulse rounded-md bg-rail-item motion-reduce:animate-none" />
            </li>
          ))
        : shown.map((item, index) => (
            <li key={item.id} className={cell(index)}>
              <ShelfCard
                item={item}
                rank={ranked.includes(list) ? index + 1 : null}
                onEntry={onEntry && ((entry) => onEntry(item.id, entry))}
              />
            </li>
          ))}
    </ul>
  );
}

export function MediaShelf({
  heading,
  layout = "row",
  cardClassName = "w-36",
  className = "",
}: {
  heading?: ReactNode;
  layout?: "row" | "grid";
  cardClassName?: string;
  className?: string;
}) {
  const token = useAuthStore((state) => state.token);
  const type = useMediaShelfStore((state) => state.type);
  const list = useMediaShelfStore((state) => state.list);
  const setType = useMediaShelfStore((state) => state.setType);
  const setList = useMediaShelfStore((state) => state.setList);
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<Record<string, MediaListItem[] | null>>({});
  const requested = useRef(new Set<string>());
  const row = useRef<HTMLUListElement>(null);
  const grid = layout === "grid";

  useEffect(() => {
    let active = true;
    Promise.resolve(useMediaShelfStore.persist.rehydrate()).then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    for (const value of grid ? types : [type]) {
      const key = `${value}:${list}`;
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      getMediaList(token, value, list)
        .then((found) => setResults((current) => ({ ...current, [key]: found })))
        .catch(() => setResults((current) => ({ ...current, [key]: null })));
    }
  }, [grid, list, ready, token, type]);

  useEffect(() => {
    row.current?.scrollTo({ left: 0 });
  }, [list, type]);

  function setEntry(id: string, entry: SavedEntry) {
    setResults((current) =>
      Object.fromEntries(
        Object.entries(current).map(([listKey, found]) => [
          listKey,
          found &&
            found.map((item) =>
              item.id === id ? { ...item, entry, inLibrary: entry !== null } : item,
            ),
        ]),
      ),
    );
  }

  function scroll(direction: 1 | -1) {
    const element = row.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = lists.indexOf(list);
    const next = lists[(index + (event.key === "ArrowRight" ? 1 : -1) + lists.length) % lists.length];
    setList(next);
    document.getElementById(`media-shelf-${next}`)?.focus();
  }

  const onEntry = token ? setEntry : undefined;

  return (
    <section aria-label="Discover anime, manga, and games" className={`flex min-w-0 flex-col gap-3 ${className}`}>
      {heading}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div
          role="tablist"
          aria-label="Lists"
          onKeyDown={handleKeyDown}
          className="flex min-w-0 gap-4 overflow-x-auto [scrollbar-width:none]"
        >
          {lists.map((value) => {
            const selected = value === list;
            const Icon = listIcons[value];
            return (
              <button
                key={value}
                id={`media-shelf-${value}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="media-shelf-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setList(value)}
                className={`focus-ring flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 py-1 text-sm whitespace-nowrap transition-colors motion-reduce:transition-none ${
                  selected
                    ? "border-accent font-semibold text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <Icon size={14} aria-hidden />
                {listLabel(value, grid ? null : type)}
              </button>
            );
          })}
        </div>
        {!grid && (
          <div className="flex items-center gap-2">
            <Segmented<MediaType>
              size="small"
              value={type}
              onChange={setType}
              options={types.map((value) => ({
                value,
                icon: mediaTypes[value].icon,
                label: sectionTitles[value],
              }))}
            />
            <span className="flex max-sm:hidden">
              <button
                type="button"
                aria-label="Scroll back"
                onClick={() => scroll(-1)}
                className="icon-button cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Scroll forward"
                onClick={() => scroll(1)}
                className="icon-button cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </span>
          </div>
        )}
      </div>
      <div
        id="media-shelf-panel"
        role="tabpanel"
        aria-labelledby={`media-shelf-${list}`}
        className={grid ? "mt-3 flex flex-col gap-10" : ""}
      >
        {grid ? (
          types.map((value) => (
            <section key={value} aria-label={sectionTitles[value]} className="flex flex-col gap-4">
              <h3 className="flex items-center gap-2 font-display text-2xl font-bold">
                <span aria-hidden className="text-accent [&>svg]:size-5">
                  {mediaTypes[value].icon}
                </span>
                {sectionTitles[value]}
              </h3>
              <ShelfItems
                items={results[`${value}:${list}`]}
                list={list}
                grid
                cardClassName={cardClassName}
                onEntry={onEntry}
              />
            </section>
          ))
        ) : (
          <ShelfItems
            items={results[`${type}:${list}`]}
            list={list}
            grid={false}
            cardClassName={cardClassName}
            onEntry={onEntry}
            rowRef={row}
          />
        )}
      </div>
    </section>
  );
}

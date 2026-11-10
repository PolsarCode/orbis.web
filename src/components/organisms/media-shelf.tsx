"use client";

import { ConfigProvider } from "antd";
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
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import {
  getMediaList,
  type LibraryEntry,
  type MediaListItem,
  type MediaListName,
  type MediaType,
} from "@/lib/api";
import * as Atom from "@atom";
import { countLabel, libraryPath, mediaPath, mediaTypeParam } from "@/lib/library";
import { useAuthStore } from "@/stores/auth-store";
import { useMediaShelfStore } from "@/stores/media-shelf-store";
import { mediaTypes } from "./activity-card";
import { drift, DRIFT_MS, SLIDE_MS } from "./anime-spotlight";
import { AddStatusPill, MediaCover, MediaTypeSwitch, StatusPill } from "./library-view";

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
const FEATURED = 5;
const listKey = (type: MediaType, list: MediaListName) => `${type}:${list}`;

function hasList(type: MediaType, list: MediaListName) {
  return !(type === "manga" && list === "upcoming");
}

function listLabel(list: MediaListName, type: MediaType | null) {
  if (list === "season") {
    return type ? { anime: "This season", manga: "New series", game: "New releases" }[type] : "New";
  }
  return { trending: "Trending", top: "Top rated", upcoming: "Coming soon" }[list];
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

function ListUnavailable() {
  return <p className="py-6 text-sm text-muted">This list isn’t available right now.</p>;
}

function ShelfItems({
  items,
  list,
  grid,
  cardClassName,
  onEntry,
  rowRef,
  onScroll,
}: {
  items: MediaListItem[] | null | undefined;
  list: MediaListName;
  grid: boolean;
  cardClassName?: string;
  onEntry?: (id: string, entry: SavedEntry) => void;
  rowRef?: Ref<HTMLUListElement>;
  onScroll?: () => void;
}) {
  if (items === null) return <ListUnavailable />;

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
      onScroll={onScroll}
      aria-busy={shown === undefined}
      className={
        grid
          ? "grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4"
          : "flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]"
      }
    >
      {shown === undefined
        ? Array.from({ length: size }, (_, index) => (
            <li key={index} aria-hidden className={cell(index)}>
              <span className="relative block aspect-[2/3] animate-pulse rounded-md border border-divider bg-rail-item motion-reduce:animate-none">
                <span className="absolute inset-x-2 top-2 flex flex-col gap-1.5">
                  <span className="h-2.5 w-4/5 rounded-full bg-surface" />
                  <span className="h-2.5 w-1/2 rounded-full bg-surface" />
                </span>
                <span className="absolute inset-x-2 bottom-2.5 flex items-center gap-2">
                  <span className="h-2 w-6 rounded-full bg-surface" />
                  <span className="h-2 w-9 rounded-full bg-surface" />
                </span>
              </span>
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

function useMediaLists(keys: string[], ready = true) {
  const token = useAuthStore((state) => state.token);
  const [results, setResults] = useState<Record<string, MediaListItem[] | null>>({});
  const requested = useRef(new Set<string>());
  const wanted = keys.join(",");

  useEffect(() => {
    if (!ready) return;
    for (const key of wanted.split(",")) {
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      const [type, list] = key.split(":") as [MediaType, MediaListName];
      getMediaList(token, type, list)
        .then((found) => setResults((current) => ({ ...current, [key]: found })))
        .catch(() => setResults((current) => ({ ...current, [key]: null })));
    }
  }, [ready, token, wanted]);

  function setEntry(id: string, entry: SavedEntry) {
    setResults((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, found]) => [
          key,
          found &&
            found.map((item) =>
              item.id === id ? { ...item, entry, inLibrary: entry !== null } : item,
            ),
        ]),
      ),
    );
  }

  return { results, onEntry: token ? setEntry : undefined };
}

function ShelfRow({
  items,
  list,
  cardClassName,
  onEntry,
}: {
  items: MediaListItem[] | null | undefined;
  list: MediaListName;
  cardClassName: string;
  onEntry?: (id: string, entry: SavedEntry) => void;
}) {
  const [edges, setEdges] = useState({ back: false, forward: false });
  const row = useRef<HTMLUListElement>(null);

  function updateEdges() {
    const element = row.current;
    if (!element) return;
    const back = element.scrollLeft > 4;
    const forward = element.scrollLeft + element.clientWidth < element.scrollWidth - 4;
    setEdges((current) =>
      current.back === back && current.forward === forward ? current : { back, forward },
    );
  }

  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const observer = new ResizeObserver(() => updateEdges());
    observer.observe(element);
    return () => observer.disconnect();
  }, [items]);

  function scroll(direction: 1 | -1) {
    const element = row.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <ShelfItems
        items={items}
        list={list}
        grid={false}
        cardClassName={cardClassName}
        onEntry={onEntry}
        rowRef={row}
        onScroll={updateEdges}
      />
      {edges.back && (
        <span className="absolute top-1/2 left-1 -translate-y-1/2 max-sm:hidden">
          <Atom.Button
            variant="secondary"
            shape="circle"
            size="small"
            aria-label="Previous"
            onClick={() => scroll(-1)}
            icon={<ChevronLeft size={14} />}
            className="shadow-md"
          />
        </span>
      )}
      {edges.forward && (
        <span className="absolute top-1/2 right-1 -translate-y-1/2 max-sm:hidden">
          <Atom.Button
            variant="secondary"
            shape="circle"
            size="small"
            aria-label="Next"
            onClick={() => scroll(1)}
            icon={<ChevronRight size={14} />}
            className="shadow-md"
          />
        </span>
      )}
    </div>
  );
}

function useShelfReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve(useMediaShelfStore.persist.rehydrate()).then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return ready;
}

export function MediaShelf({ heading, className = "" }: { heading?: ReactNode; className?: string }) {
  const list = useMediaShelfStore((state) => state.list);
  const setList = useMediaShelfStore((state) => state.setList);
  const ready = useShelfReady();
  const sections = types.filter((value) => hasList(value, list));
  const { results, onEntry } = useMediaLists(
    sections.map((value) => listKey(value, list)),
    ready,
  );

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = lists.indexOf(list);
    const next = lists[(index + (event.key === "ArrowRight" ? 1 : -1) + lists.length) % lists.length];
    setList(next);
    document.getElementById(`media-shelf-${next}`)?.focus();
  }

  return (
    <section aria-label="Discover anime, manga, and games" className={`flex min-w-0 flex-col gap-3 ${className}`}>
      {heading}
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
              {listLabel(value, null)}
            </button>
          );
        })}
      </div>
      <div
        id="media-shelf-panel"
        role="tabpanel"
        aria-labelledby={`media-shelf-${list}`}
        className="mt-3 flex flex-col gap-10"
      >
        {sections.map((value) => (
          <section key={value} aria-label={sectionTitles[value]} className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 font-display text-2xl font-bold">
              <span aria-hidden className="text-accent [&>svg]:size-5">
                {mediaTypes[value].icon}
              </span>
              {sectionTitles[value]}
            </h3>
            <ShelfItems
              items={results[listKey(value, list)]}
              list={list}
              grid
              onEntry={onEntry}
            />
          </section>
        ))}
      </div>
    </section>
  );
}

function FeaturedSlide({
  item,
  rank,
  visible,
  onEntry,
}: {
  item: MediaListItem;
  rank: number;
  visible: boolean;
  onEntry?: (entry: SavedEntry) => void;
}) {
  const href = mediaPath(item.type, item.sourceId);
  const backdrop = item.bannerImage ?? item.coverImage;
  const entry = item.entry && { ...item.entry, mediaType: item.type, title: item.title };
  const meta = [countLabel(item), ...item.genres.slice(0, 3)];
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !frame.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    frame.current.animate(drift, { duration: DRIFT_MS, easing: "linear", fill: "forwards" });
  }, [visible]);

  return (
    <div
      inert={!visible}
      className={`absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none ${
        visible ? "opacity-100 delay-200 duration-700" : "pointer-events-none opacity-0 duration-300"
      }`}
    >
      {backdrop && (
        <div
          ref={frame}
          style={{ transform: String(drift[0].transform) }}
          className="absolute inset-0"
        >
          <Image
            src={backdrop}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 50vw, 100vw"
            className={`object-cover ${item.bannerImage ? "" : "scale-110 blur-2xl"}`}
          />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/10 sm:bg-gradient-to-r sm:from-black/90 sm:via-black/65 sm:to-black/10" />
      <div className="relative flex h-full items-end gap-5 p-5 sm:p-6">
        <Link href={href} tabIndex={-1} aria-hidden className="shrink-0 max-sm:hidden">
          <MediaCover src={item.coverImage} className="w-28 shadow-lg" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2 text-white">
          <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-white/80 uppercase">
            <Flame size={14} aria-hidden className="text-accent" />#{rank} trending
          </span>
          <Link
            href={href}
            className="focus-ring line-clamp-2 rounded-sm font-display text-2xl leading-tight font-bold hover:underline sm:text-3xl"
          >
            {item.title}
          </Link>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/80">
            {item.score !== null && (
              <span className="flex items-center gap-1 font-semibold text-white">
                <Star size={12} aria-hidden className="fill-current text-warning" />
                {item.score.toFixed(1)}
              </span>
            )}
            {meta.join(" · ")}
          </span>
          {item.synopsis && (
            <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-white/85 max-sm:hidden">
              {item.synopsis}
            </p>
          )}
          {onEntry && (
            <div className="pt-1">
              {entry ? (
                <StatusPill entry={entry} onChange={(changed) => onEntry(saved(changed))} />
              ) : (
                <AddStatusPill media={item} onAdded={(added) => onEntry(saved(added))} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Featured({
  items,
  onEntry,
  menu,
  arrows = false,
}: {
  items: MediaListItem[] | null | undefined;
  onEntry?: (id: string, entry: SavedEntry) => void;
  menu?: ReactNode;
  arrows?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = (items ?? []).slice(0, FEATURED);
  const count = slides.length;
  const unavailable = items === null || (items !== undefined && count === 0);
  const step = (by: number) => (index + by + count) % count;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => setIndex((value) => (value + 1) % count), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [count, index, paused]);

  if (unavailable && !menu) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      aria-busy={items === undefined}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) setPaused(true);
      }}
      onBlur={() => setPaused(false)}
      className="relative isolate h-72 overflow-hidden rounded-lg border border-divider bg-rail sm:h-80"
    >
      {items === undefined && (
        <div aria-hidden className="absolute inset-0 animate-pulse bg-rail-item motion-reduce:animate-none" />
      )}
      {unavailable && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ListUnavailable />
        </div>
      )}
      {slides.map((item, position) => (
        <FeaturedSlide
          key={item.id}
          item={item}
          rank={position + 1}
          visible={position === index}
          onEntry={onEntry && ((entry) => onEntry(item.id, entry))}
        />
      ))}
      {(menu || (arrows && count > 1)) && (
        <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-2 sm:inset-x-6 sm:top-5">
          {menu}
          {arrows && count > 1 && (
            <div className="ml-auto flex gap-1 rounded-lg bg-black/50 p-1 backdrop-blur-md">
              {[-1, 1].map((by) => {
                const Chevron = by < 0 ? ChevronLeft : ChevronRight;
                return (
                  <button
                    key={by}
                    type="button"
                    aria-label={`${by < 0 ? "Previous" : "Next"}: ${slides[step(by)].title}`}
                    onClick={() => setIndex(step(by))}
                    className="focus-ring flex size-7 cursor-pointer items-center justify-center rounded-md text-white/85 transition-colors hover:bg-white/15 hover:text-white motion-reduce:transition-none"
                  >
                    <Chevron size={18} aria-hidden />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="absolute right-5 bottom-5 flex items-center gap-1.5 sm:right-6 sm:bottom-6">
        {slides.map((item, position) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Show ${item.title}`}
            aria-current={position === index}
            onClick={() => setIndex(position)}
            className={`focus-ring h-1.5 cursor-pointer rounded-full transition-all motion-reduce:transition-none ${
              position === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

const overlayMenuTheme = {
  components: {
    Segmented: {
      trackBg: "rgba(0, 0, 0, 0.5)",
      itemColor: "rgba(255, 255, 255, 0.85)",
      itemHoverColor: "#ffffff",
      itemSelectedBg: "rgba(255, 255, 255, 0.95)",
      itemSelectedColor: "#1c1d1b",
    },
  },
};

function BannerTypeSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MediaType;
  onChange: (value: MediaType) => void;
}) {
  return (
    <ConfigProvider theme={overlayMenuTheme}>
      <div className="rounded-xl backdrop-blur-md max-sm:[&_.ant-segmented-item-icon]:hidden">
        <MediaTypeSwitch label={label} value={value} onChange={onChange} block={false} />
      </div>
    </ConfigProvider>
  );
}

export function HomeDiscover() {
  const type = useMediaShelfStore((state) => state.type);
  const setType = useMediaShelfStore((state) => state.setType);
  const ready = useShelfReady();
  const key = listKey(type, "trending");
  const { results, onEntry } = useMediaLists([key], ready);

  return (
    <Featured
      key={type}
      items={results[key]}
      onEntry={onEntry}
      arrows
      menu={<BannerTypeSwitch label="Trending types" value={type} onChange={setType} />}
    />
  );
}

export function LibraryDiscover() {
  const router = useRouter();
  const type = mediaTypeParam(useSearchParams().get("type"));
  const shown = lists.filter((list) => hasList(type, list));
  const { results, onEntry } = useMediaLists(shown.map((list) => listKey(type, list)));

  return (
    <div className="flex flex-col gap-8">
      <Featured
        key={type}
        items={results[listKey(type, "trending")]}
        onEntry={onEntry}
        arrows
        menu={
          <BannerTypeSwitch
            label="Discover types"
            value={type}
            onChange={(value) => router.push(libraryPath("discover", value))}
          />
        }
      />
      {shown.map((list) => {
        const Icon = listIcons[list];
        return (
          <section
            key={list}
            aria-labelledby={`media-list-${list}`}
            className="flex min-w-0 flex-col gap-3"
          >
            <h2
              id={`media-list-${list}`}
              className="flex items-center gap-2 font-display text-xl font-bold"
            >
              <Icon size={18} aria-hidden className="text-accent" />
              {listLabel(list, type)}
            </h2>
            <ShelfRow
              key={listKey(type, list)}
              items={results[listKey(type, list)]}
              list={list}
              cardClassName="w-32 sm:w-36"
              onEntry={onEntry}
            />
          </section>
        );
      })}
    </div>
  );
}

"use client";

import { Tooltip } from "antd";
import { ChevronUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import * as Atom from "@atom";
import { getLibrary, type LibraryEntry } from "@/lib/api";
import { useIsPhone } from "@/lib/use-is-phone";
import { useAuthStore } from "@/stores/auth-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useLibraryPreferencesStore } from "@/stores/library-preferences-store";
import { useSearchStore } from "@/stores/search-store";
import { SiteFooter } from "./site-footer";
import {
  filterLibrary,
  LibraryCard,
  LibraryEmptyState,
  LibraryTabs,
  searchTitles,
} from "./library-view";

const PANEL_HEIGHT = 352;
const CLOSED_HEIGHT = 12;
const PULL_DISTANCE = 40;
const notchCorners = [
  "before:pointer-events-none before:absolute before:right-full before:bottom-0 before:size-2.5 before:content-['']",
  "before:bg-[radial-gradient(circle_at_0_0,transparent_8.5px,var(--color-divider)_9px,var(--color-divider)_10px,var(--color-rail)_10.5px)]",
  "after:pointer-events-none after:absolute after:bottom-0 after:left-full after:size-2.5 after:content-['']",
  "after:bg-[radial-gradient(circle_at_100%_0,transparent_8.5px,var(--color-divider)_9px,var(--color-divider)_10px,var(--color-rail)_10.5px)]",
].join(" ");

function DockShelf({
  entries,
  onChange,
  onRemove,
}: {
  entries: LibraryEntry[] | null;
  onChange: (entry: LibraryEntry) => void;
  onRemove: (id: number) => void;
}) {
  const status = useLibraryPreferencesStore((state) => state.status);
  const type = useLibraryPreferencesStore((state) => state.type);

  if (!entries) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Atom.Loader />
      </div>
    );
  }

  const shown = filterLibrary(entries, type, status);

  if (shown.length === 0) {
    return (
      <LibraryEmptyState
        compact
        entries={entries}
        onSearch={() => searchTitles()}
      />
    );
  }

  return (
    <ul
      className="flex min-h-0 flex-1 snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-4 pb-3 sm:scroll-px-8 sm:px-8"
      onWheel={(event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          event.currentTarget.scrollLeft += event.deltaY;
        }
      }}
    >
      {shown.map((entry) => (
        <li key={entry.id} className="w-44 shrink-0 snap-start">
          <LibraryCard entry={entry} onChange={onChange} onRemove={onRemove} />
        </li>
      ))}
    </ul>
  );
}

export function LibraryDock() {
  const profile = useAuthStore((state) => state.profile);
  const pathname = usePathname();
  const locked = pathname === "/library";
  const storedOpen = useLayoutStore((state) => state.dockOpen);
  const open = storedOpen && !locked;
  const [settled, setSettled] = useState(false);
  const expanded = open || (storedOpen && !settled);
  const setOpen = useLayoutStore((state) => state.setDockOpen);
  const restoreDock = useLayoutStore((state) => state.restoreDock);
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const libraryChanges = useSearchStore((state) => state.libraryChanges);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<number | null>(null);
  const dragged = useRef(false);
  const dock = useRef<HTMLElement>(null);
  const footer = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const isPhone = useIsPhone();
  const shown = profile !== null && !isPhone;
  const panelHeight = PANEL_HEIGHT + footerHeight;
  const height = shown
    ? Math.min(
        panelHeight,
        Math.max(CLOSED_HEIGHT, (expanded ? panelHeight : CLOSED_HEIGHT) - (drag ?? 0)),
      )
    : 0;

  useEffect(() => {
    const element = footer.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setFooterHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [shown]);

  useLayoutEffect(() => {
    restoreDock();
    useLibraryPreferencesStore.persist.rehydrate();
  }, [restoreDock]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!open || !shown || !token) return;

    let ignore = false;
    getLibrary(token)
      .then((library) => {
        if (!ignore) setEntries(library);
      })
      .catch(() => {
        if (!ignore) setEntries([]);
      });
    return () => {
      ignore = true;
    };
  }, [open, shown, libraryChanges]);

  useEffect(() => {
    const element = dock.current;
    if (!element) return;

    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty("--library-dock-height", `${element.offsetHeight}px`),
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--library-dock-height");
    };
  }, [shown]);

  if (!shown) return null;

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (locked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = event.clientY;
    dragged.current = false;
    setDrag(0);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (start.current === null) return;
    const distance = event.clientY - start.current;
    if (Math.abs(distance) > 4) dragged.current = true;
    setDrag(distance);
  }

  function handlePointerUp() {
    const distance = drag ?? 0;
    start.current = null;
    setDrag(null);
    if (distance < -PULL_DISTANCE) setOpen(true);
    else if (distance > PULL_DISTANCE) setOpen(false);
  }

  const replace = (entry: LibraryEntry) =>
    setEntries((current) => current?.map((item) => (item.id === entry.id ? entry : item)) ?? null);
  const remove = (id: number) =>
    setEntries((current) => current?.filter((item) => item.id !== id) ?? null);

  return (
    <section
      ref={dock}
      aria-label="Your library"
      data-dock=""
      style={{ height }}
      className={`relative z-10 shrink-0 bg-rail ${
        drag === null
          ? "transition-[height] duration-300 ease-out motion-reduce:transition-none"
          : ""
      }`}
    >
      <Tooltip
        title={locked ? "Your library is already open on this page." : undefined}
        styles={{ root: { maxWidth: "none" } }}
      >
        <button
          type="button"
          data-tour="library-dock"
          aria-label={open ? "Hide your library" : "Show your library"}
          aria-expanded={open}
          aria-controls="library-dock-panel"
          aria-disabled={locked || undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={() => {
            if (locked) return;
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            setOpen(!open);
          }}
          className={`focus-ring absolute bottom-full left-1/2 flex h-7 -translate-x-1/2 touch-none items-center rounded-t-lg border border-b-0 border-divider bg-rail px-5 select-none ${
            locked ? "cursor-not-allowed text-muted" : "cursor-grab active:cursor-grabbing"
          } ${notchCorners}`}
        >
          <span aria-hidden className="absolute -inset-x-3 -inset-y-2" />
          <ChevronUp
            size={16}
            aria-hidden
            className={`transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </Tooltip>
      <div
        id="library-dock-panel"
        inert={!open}
        className={`h-full overflow-hidden transition-[visibility] ${
          expanded || drag !== null ? "visible" : "invisible delay-300"
        }`}
      >
        <div style={{ height: panelHeight }} className="flex flex-col">
          <LibraryTabs entries={entries} bordered={false} />
          <div className="flex min-h-0 flex-1 flex-col rounded-l-2xl border-y border-l border-divider bg-background">
            <DockShelf entries={entries} onChange={replace} onRemove={remove} />
          </div>
          <div ref={footer} className="shrink-0">
            <SiteFooter bordered={false} compact />
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { Segmented, Select, Switch } from "antd";
import { Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { getLibrary, type LibraryStatus, type MediaType, type SteamLink } from "@/lib/api";
import { libraryStatuses, statusLabel } from "@/lib/library";
import { useTabScroller } from "@/lib/use-tab-scroller";
import { useAuthStore } from "@/stores/auth-store";
import { ReadOnlyLibraryCard, typeLabel } from "./library-view";

type ShelfEntry = {
  id: number;
  mediaType: MediaType;
  sourceId: string;
  title: string;
  coverImage: string | null;
  year?: number | null;
  status: LibraryStatus;
  progress: number;
  total: number | null;
  isPublic?: boolean;
  steam?: SteamLink | null;
};

type Sort = "updated" | "title" | "year";

const sorts: { value: Sort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "title", label: "Title A–Z" },
  { value: "year", label: "Newest release" },
];

const mediaTypeOrder: MediaType[] = ["anime", "manga", "game"];

const mediaKey = (entry: { mediaType: MediaType; sourceId: string }) =>
  `${entry.mediaType}:${entry.sourceId}`;

const searchable = (text: string) =>
  text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();

const byTitle = (a: ShelfEntry, b: ShelfEntry) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true });

function sortEntries(entries: ShelfEntry[], sort: Sort) {
  if (sort === "updated") return entries;
  return [...entries].sort((a, b) => {
    if (sort === "year" && (a.year ?? null) !== (b.year ?? null)) {
      if (a.year == null) return 1;
      if (b.year == null) return -1;
      return b.year - a.year;
    }
    return byTitle(a, b);
  });
}

function useViewerLibrary(enabled: boolean) {
  const token = useAuthStore((state) => state.token);
  const [keys, setKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!enabled || !token) return;
    let ignore = false;
    getLibrary(token)
      .then((library) => {
        if (!ignore) setKeys(new Set(library.map(mediaKey)));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [enabled, token]);

  return enabled && token ? keys : null;
}

export function ProfileLibrary({
  entries,
  compare = false,
  action,
}: {
  entries: ShelfEntry[];
  compare?: boolean;
  action?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | MediaType>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [status, setStatus] = useState<"all" | LibraryStatus>("all");
  const [sharedOnly, setSharedOnly] = useState(false);
  const mine = useViewerLibrary(compare);
  const [tabsRef, tabsFade] = useTabScroller<HTMLDivElement>(status);

  const types = mediaTypeOrder.filter((value) => entries.some((entry) => entry.mediaType === value));
  const shared = mine ? entries.filter((entry) => mine.has(mediaKey(entry))).length : 0;
  const onlyShared = sharedOnly && shared > 0;
  const search = searchable(query.trim());

  const matching = entries.filter(
    (entry) =>
      (type === "all" || entry.mediaType === type) &&
      (!onlyShared || mine?.has(mediaKey(entry))) &&
      (!search || searchable(entry.title).includes(search)),
  );
  const shown = sortEntries(
    matching.filter((entry) => status === "all" || entry.status === status),
    sort,
  );
  const tabs = (["all", ...libraryStatuses] as const).filter(
    (value) => value === "all" || entries.some((entry) => entry.status === value),
  );
  const count = (value: "all" | LibraryStatus) =>
    value === "all" ? matching.length : matching.filter((entry) => entry.status === value).length;
  const filtered = Boolean(search) || type !== "all" || onlyShared || status !== "all";

  function clearFilters() {
    setQuery("");
    setType("all");
    setStatus("all");
    setSharedOnly(false);
  }

  return (
    <Molecule.TabSection
      title="Library"
      count={entries.length}
      actions={
        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
          {entries.length > 0 && (
            <div
              ref={tabsRef}
              style={tabsFade}
              className="max-w-full min-w-0 overflow-x-auto [scrollbar-width:none]"
            >
              <Segmented<"all" | LibraryStatus>
                size="small"
                value={status}
                onChange={setStatus}
                options={tabs.map((value) => ({
                  value,
                  label: `${
                    value === "all" ? "All" : statusLabel(value, type === "all" ? undefined : type)
                  } · ${count(value)}`,
                }))}
              />
            </div>
          )}
          {action}
        </div>
      }
    >
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Nothing in the library yet.</p>
      ) : (
        <>
          {entries.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <Atom.Input
                allowClear
                aria-label="Search this library"
                placeholder="Search titles"
                prefix={<Search size={14} className="text-muted" />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full! sm:w-auto! sm:min-w-48 sm:flex-1"
              />
              {types.length > 1 && (
                <Select<"all" | MediaType>
                  aria-label="Media type"
                  value={type}
                  onChange={setType}
                  popupMatchSelectWidth={false}
                  className="w-32"
                  options={(["all", ...types] as const).map((value) => ({
                    value,
                    label: typeLabel(value),
                  }))}
                />
              )}
              <Select<Sort>
                aria-label="Sort by"
                value={sort}
                onChange={setSort}
                popupMatchSelectWidth={false}
                className="w-40"
                options={sorts}
              />
              {shared > 0 && (
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs whitespace-nowrap">
                  <Switch size="small" checked={sharedOnly} onChange={setSharedOnly} />
                  In your library · {shared}
                </label>
              )}
            </div>
          )}
          {shown.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-6">
              <p className="text-sm text-muted">No titles match these filters.</p>
              {filtered && (
                <Atom.Button size="small" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Atom.Button>
              )}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {shown.map((entry) => (
                <li key={entry.id}>
                  <ReadOnlyLibraryCard entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Molecule.TabSection>
  );
}

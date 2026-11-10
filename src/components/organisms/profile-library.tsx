"use client";

import { Switch } from "antd";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { getLibrary, type LibraryStatus, type MediaType, type SteamLink } from "@/lib/api";
import { searchable } from "@/lib/library";
import { useAuthStore } from "@/stores/auth-store";
import {
  useLibraryPreferencesStore,
  type LibrarySort,
  type LibraryStatusFilter,
  type LibraryTypeFilter,
} from "@/stores/library-preferences-store";
import {
  filterLibrary,
  LibraryStatusSwitch,
  LibraryToolbar,
  ReadOnlyLibraryEntries,
  sortEntries,
} from "./library-view";

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

const mediaTypeOrder: MediaType[] = ["anime", "manga", "game"];

const mediaKey = (entry: { mediaType: MediaType; sourceId: string }) =>
  `${entry.mediaType}:${entry.sourceId}`;

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
  const [type, setType] = useState<LibraryTypeFilter>("all");
  const [sort, setSort] = useState<LibrarySort>("updated");
  const [status, setStatus] = useState<LibraryStatusFilter>("all");
  const [sharedOnly, setSharedOnly] = useState(false);
  const view = useLibraryPreferencesStore((state) => state.view);
  const mine = useViewerLibrary(compare);

  useEffect(() => {
    useLibraryPreferencesStore.persist.rehydrate();
  }, []);

  const types = mediaTypeOrder.filter((value) => entries.some((entry) => entry.mediaType === value));
  const shared = mine ? entries.filter((entry) => mine.has(mediaKey(entry))).length : 0;
  const onlyShared = sharedOnly && shared > 0;
  const search = searchable(query.trim());

  const searched = entries.filter(
    (entry) =>
      (!onlyShared || mine?.has(mediaKey(entry))) &&
      (!search || searchable(entry.title).includes(search)),
  );
  const shown = sortEntries(filterLibrary(searched, type, status), sort);
  const filtered = Boolean(search) || type !== "all" || onlyShared || status !== "all";

  function clearFilters() {
    setQuery("");
    setType("all");
    setStatus("all");
    setSharedOnly(false);
  }

  return (
    <Molecule.TabSection title="Library" count={entries.length} actions={action}>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Nothing in the library yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <LibraryToolbar
            query={query}
            onQuery={setQuery}
            type={type}
            onType={setType}
            types={types}
            sort={sort}
            onSort={setSort}
          >
            {shared > 0 && (
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs whitespace-nowrap">
                <Switch size="small" checked={sharedOnly} onChange={setSharedOnly} />
                In your library · {shared}
              </label>
            )}
          </LibraryToolbar>
          <LibraryStatusSwitch entries={searched} type={type} status={status} onChange={setStatus} />
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
            <ReadOnlyLibraryEntries entries={shown} view={view} />
          )}
        </div>
      )}
    </Molecule.TabSection>
  );
}

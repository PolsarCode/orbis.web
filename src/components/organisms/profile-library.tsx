"use client";

import { Segmented } from "antd";
import { useState, type ReactNode } from "react";
import * as Molecule from "@molecule";
import type { LibraryStatus, MediaType, SteamLink } from "@/lib/api";
import { libraryStatuses, statusLabel } from "@/lib/library";
import { useTabScroller } from "@/lib/use-tab-scroller";
import { ReadOnlyLibraryCard } from "./library-view";

type ShelfEntry = {
  id: number;
  mediaType: MediaType;
  sourceId: string;
  title: string;
  coverImage: string | null;
  status: LibraryStatus;
  progress: number;
  total: number | null;
  isPublic?: boolean;
  steam?: SteamLink | null;
};

export function ProfileLibrary({
  entries,
  action,
}: {
  entries: ShelfEntry[];
  action?: ReactNode;
}) {
  const [status, setStatus] = useState<"all" | LibraryStatus>("all");
  const [tabsRef, tabsFade] = useTabScroller<HTMLDivElement>(status);
  const shown = entries.filter((entry) => status === "all" || entry.status === status);
  const tabs = (["all", ...libraryStatuses] as const).filter(
    (value) => value === "all" || entries.some((entry) => entry.status === value),
  );

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
                  label: `${value === "all" ? "All" : statusLabel(value)} · ${
                    value === "all"
                      ? entries.length
                      : entries.filter((entry) => entry.status === value).length
                  }`,
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {shown.map((entry) => (
            <li key={entry.id}>
              <ReadOnlyLibraryCard entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </Molecule.TabSection>
  );
}

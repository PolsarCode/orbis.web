"use client";

import { Checkbox, Dropdown, Popover } from "antd";
import type { ReactNode } from "react";
import {
  ChevronDown,
  LayoutPanelTop,
  List,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import * as Atom from "@atom";
import type { FeedContentType } from "@/lib/api";
import { shownTypes, useFeedPreferencesStore } from "@/stores/feed-preferences-store";

const labels = {
  post: "Posts",
  thread: "Threads",
  activity: "Library updates",
};

export function FeedFilters({
  types,
  trailing,
  filterControl,
}: {
  types: FeedContentType[];
  trailing?: ReactNode;
  filterControl?: ReactNode;
}) {
  const excluded = useFeedPreferencesStore((state) => state.excludedTypes);
  const setShown = useFeedPreferencesStore((state) => state.setShown);
  const showAll = useFeedPreferencesStore((state) => state.showAll);
  const shown = shownTypes(types, excluded);
  const filtered = shown.length < types.length;

  function toggle(type: FeedContentType) {
    setShown(
      types,
      shown.includes(type) ? shown.filter((value) => value !== type) : [...shown, type],
    );
  }
  const view = useFeedPreferencesStore((state) => state.view);
  const setView = useFeedPreferencesStore((state) => state.setView);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      data-tour="feed-filters"
    >
      <Dropdown
        trigger={["click"]}
        menu={{
          selectable: true,
          selectedKeys: [view],
          items: [
            { key: "card", label: "Card", icon: <LayoutPanelTop size={14} /> },
            { key: "compact", label: "Compact", icon: <List size={14} /> },
          ],
          onClick: ({ key }) => {
            if (key === "card" || key === "compact") setView(key);
          },
        }}
      >
        <Atom.Button
          size="small"
          variant="secondary"
          aria-label={`Feed view: ${view === "card" ? "Card" : "Compact"}`}
          icon={
            view === "card" ? <LayoutPanelTop size={14} /> : <List size={14} />
          }
        >
          <span className="hidden sm:inline">{view === "card" ? "Card" : "Compact"}</span>
          <ChevronDown size={12} aria-hidden />
        </Atom.Button>
      </Dropdown>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {trailing}
        {filterControl}
        {!filterControl && types.length > 1 && (
          <>
            {filtered && (
              <Atom.Button
                size="small"
                variant="secondary"
                icon={<RotateCcw size={14} />}
                onClick={showAll}
              >
                Reset Filters
              </Atom.Button>
            )}
            <Popover
              trigger="click"
              placement="bottomRight"
              content={
                <div
                  className="flex min-w-48 flex-col gap-3"
                  aria-label="Feed content types"
                >
                  <p className="text-[13px] font-semibold">Show in feeds</p>
                  {types.map((type) => (
                    <Checkbox
                      key={type}
                      checked={shown.includes(type)}
                      disabled={shown.length === 1 && shown.includes(type)}
                      onChange={() => toggle(type)}
                    >
                      {labels[type]}
                    </Checkbox>
                  ))}
                  <p className="max-w-56 text-xs text-muted">
                    Your choices apply across feeds on this browser.
                  </p>
                </div>
              }
            >
              <Atom.Button
                size="small"
                variant="secondary"
                icon={<SlidersHorizontal size={14} />}
              >
                Filter<span className="hidden sm:inline"> feed</span>
              </Atom.Button>
            </Popover>
          </>
        )}
      </div>
    </div>
  );
}

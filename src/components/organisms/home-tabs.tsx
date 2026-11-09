"use client";

import { Bookmark, Hash, Newspaper, Trophy } from "lucide-react";
import * as Atom from "@atom";
import { useTabScroller } from "@/lib/use-tab-scroller";

export const homeTabs = [
  { value: "feed", label: "Feed", icon: <Newspaper size={16} /> },
  { value: "trending", label: "Trending", icon: <Hash size={16} /> },
  { value: "charts", label: "Charts", icon: <Trophy size={16} /> },
  { value: "bookmarks", label: "Bookmarks", icon: <Bookmark size={16} /> },
] as const;

export type HomeTab = (typeof homeTabs)[number]["value"];

export function HomeTabs({ tab }: { tab: HomeTab }) {
  const [tabsRef, tabsFade] = useTabScroller<HTMLElement>(tab);

  return (
    <nav
      ref={tabsRef}
      style={tabsFade}
      aria-label="Home sections"
      data-tour="home-tabs"
      className="flex shrink-0 items-end gap-6 overflow-x-auto border-b border-divider px-4 sm:px-8"
    >
      {homeTabs.map(({ value, label, icon }) => (
        <Atom.TabLink
          key={value}
          href={value === "feed" ? "/" : `/?tab=${value}`}
          active={tab === value}
          className="-mb-px"
        >
          {icon}
          {label}
        </Atom.TabLink>
      ))}
    </nav>
  );
}

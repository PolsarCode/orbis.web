"use client";

import { Bookmark, Hash, Newspaper } from "lucide-react";
import Link from "next/link";
import { useTabScroller } from "@/lib/use-tab-scroller";

export const homeTabs = [
  { value: "feed", label: "Feed", icon: <Newspaper size={16} /> },
  { value: "trending", label: "Trending", icon: <Hash size={16} /> },
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
        <Link
          key={value}
          href={value === "feed" ? "/" : `/?tab=${value}`}
          aria-current={tab === value ? "page" : undefined}
          className={`focus-ring -mb-px flex shrink-0 items-center gap-2 rounded-t-sm border-b-2 px-1 py-3 text-sm transition-colors ${
            tab === value
              ? "border-accent text-accent"
              : "border-transparent font-semibold text-foreground hover:text-accent"
          }`}
        >
          {icon}
          {label}
        </Link>
      ))}
    </nav>
  );
}

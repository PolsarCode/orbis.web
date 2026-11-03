"use client";

import { Bookmark, Newspaper } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as Molecule from "@molecule";
import * as Template from "@template";
import { getBookmarks } from "@/lib/api";
import type { ChangelogDay } from "@/lib/changelog";
import { usePaged } from "@/lib/use-paged";
import { useTabScroller } from "@/lib/use-tab-scroller";
import { BookmarksSearchScope } from "./content-search";
import { FriendsPanel } from "./friends-panel";
import { HomeFeed } from "./home-feed";
import { PostList } from "./post-list";
import { SidePanel } from "./side-panel";
import { pageTitle } from "@/lib/site-title";
import { useDocumentTitle } from "@/lib/use-document-title";

const tabs = [
  { value: "feed", label: "Feed", icon: <Newspaper size={16} /> },
  { value: "bookmarks", label: "Bookmarks", icon: <Bookmark size={16} /> },
] as const;

type Tab = (typeof tabs)[number]["value"];

function Bookmarks() {
  const feed = usePaged(getBookmarks, { types: ["post"] });

  return (
    <PostList
      showCommunity
      feed={feed}
      empty={{
        title: "No bookmarks yet.",
        description: "Choose Save post in a post’s … menu to keep it here.",
      }}
      end={<Molecule.FeedEnd label="That’s everything you’ve saved" />}
    />
  );
}

export function HomeView({ latestChangelog }: { latestChangelog: ChangelogDay | null }) {
  useDocumentTitle(pageTitle("Home"));
  const requested = useSearchParams().get("tab");
  const tab: Tab = tabs.find(({ value }) => value === requested)?.value ?? "feed";
  const [tabsRef, tabsFade] = useTabScroller<HTMLElement>(tab);

  return (
    <>
      {tab === "bookmarks" && <BookmarksSearchScope />}
      <nav
        ref={tabsRef}
        style={tabsFade}
        aria-label="Home sections"
        data-tour="home-tabs"
        className="flex shrink-0 items-end gap-6 overflow-x-auto border-b border-divider px-4 sm:px-8"
      >
        {tabs.map(({ value, label, icon }) => (
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
      <div className="flex min-h-0 flex-1">
        <Template.PageColumn>
          {tab === "bookmarks" ? <Bookmarks /> : <HomeFeed latestChangelog={latestChangelog} />}
        </Template.PageColumn>
        <SidePanel label="Friends">
          <FriendsPanel />
        </SidePanel>
      </div>
    </>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import * as Molecule from "@molecule";
import * as Template from "@template";
import { getBookmarks } from "@/lib/api";
import type { ChangelogDay } from "@/lib/changelog";
import { usePaged } from "@/lib/use-paged";
import { BookmarksSearchScope } from "./content-search";
import { FriendsSidePanel } from "./friends-panel";
import { HomeFeed } from "./home-feed";
import { HomeTabs, homeTabs, type HomeTab } from "./home-tabs";
import { PostList } from "./post-list";
import { SearchScope } from "./site-search";
import { TrendingTags } from "./trending-tags";
import { pageTitle } from "@/lib/site-title";
import { useDocumentTitle } from "@/lib/use-document-title";

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
  const tab: HomeTab = homeTabs.find(({ value }) => value === requested)?.value ?? "feed";

  return (
    <>
      {tab === "bookmarks" && <BookmarksSearchScope />}
      {tab === "trending" && <SearchScope lead="tags" />}
      <HomeTabs tab={tab} />
      <div className="flex min-h-0 flex-1">
        <Template.PageColumn>
          {tab === "bookmarks" ? (
            <Bookmarks />
          ) : tab === "trending" ? (
            <TrendingTags />
          ) : (
            <HomeFeed latestChangelog={latestChangelog} />
          )}
        </Template.PageColumn>
        <FriendsSidePanel />
      </div>
    </>
  );
}

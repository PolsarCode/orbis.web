"use client";

import * as Template from "@template";
import type { ChangelogDay } from "@/lib/changelog";
import { FriendsPanel } from "./friends-panel";
import { HomeFeed } from "./home-feed";
import { SidePanel } from "./side-panel";
import { pageTitle } from "@/lib/site-title";
import { useDocumentTitle } from "@/lib/use-document-title";

export function HomeView({ latestChangelog }: { latestChangelog: ChangelogDay | null }) {
  useDocumentTitle(pageTitle("Home"));

  return (
    <div className="flex min-h-0 flex-1">
      <Template.PageColumn>
        <HomeFeed latestChangelog={latestChangelog} />
      </Template.PageColumn>
      <SidePanel label="Friends">
        <FriendsPanel />
      </SidePanel>
    </div>
  );
}

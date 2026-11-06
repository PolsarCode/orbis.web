"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { createPost, createWallPost, getFeed } from "@/lib/api";
import { usePaged } from "@/lib/use-paged";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import type { ChangelogDay } from "@/lib/changelog";
import { useCommunityStore } from "@/stores/community-store";
import { ChangelogBanner, useChangelogShown } from "./changelog-banner";
import { DestinationPicker, type Destination } from "./destination-picker";
import { DiscordSetupReminder, useUnfinishedDiscord } from "./discord-setup";
import { MediaShelf } from "./media-shelf";
import { PostComposer } from "./post-composer";
import { PostList } from "./post-list";
import { OnboardingChecklist, OnboardingTour } from "./onboarding";
import { TipOfTheWeek } from "./tip-of-the-week";

export function HomeFeed({ latestChangelog }: { latestChangelog: ChangelogDay | null }) {
  const feed = usePaged(getFeed, { live: true });
  const profile = useAuthStore((state) => state.profile);
  const communities = useCommunityStore((state) => state.communities);
  const [selected, setSelected] = useState<Destination>("wall");
  const community =
    selected === "wall" ? undefined : communities.find((item) => item.id === selected);
  const changelogShown = useChangelogShown(latestChangelog);
  const checklistHidden = useOnboardingStore(
    (state) => state.onboarding?.checklistDismissed === true,
  );
  const [unfinishedDiscord] = useUnfinishedDiscord();
  const reminder = unfinishedDiscord ? (
    <DiscordSetupReminder community={unfinishedDiscord} />
  ) : null;

  async function handlePost(content: string, linkUrl?: string, spoiler?: string | null) {
    const { token } = useAuthStore.getState();
    if (!token || !profile) throw new Error("Please log in again.");

    const post = community
      ? await createPost(token, community.id, content, linkUrl, spoiler)
      : await createWallPost(token, profile.username, content, linkUrl, spoiler);
    feed.prepend(post);
    useOnboardingStore.getState().refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {reminder ?? <OnboardingChecklist />}
      <OnboardingTour />
      {!reminder &&
        checklistHidden &&
        (latestChangelog && changelogShown ? (
          <ChangelogBanner day={latestChangelog} />
        ) : (
          <TipOfTheWeek />
        ))}
      <div data-tour="discover">
        <MediaShelf
          cardClassName="w-32 sm:w-36"
          className="rounded-lg border border-divider bg-surface p-4"
        />
      </div>
      {profile && (
        <div data-tour="composer">
        <PostComposer
          linkPreview
          onPost={handlePost}
          placeholder={community ? "Share an update with your community…" : "What’s on your mind?"}
          target={<DestinationPicker value={community?.id ?? "wall"} onChange={setSelected} />}
        />
        </div>
      )}
      <PostList
        showCommunity
        feed={feed}
        onQuoted={feed.prepend}
        empty={{
          title: "No posts yet.",
          description:
            "Posts from your communities will appear here.",
        }}
        end={
          <Molecule.FeedState
            eyebrow="End of feed"
            icon={<CircleCheck size={24} strokeWidth={1.5} />}
            title="You’re all caught up."
            description="You’ve seen all recent posts from your communities. Explore other communities to find more discussions."
            action={
              <Atom.ButtonLink href="/explore" variant="secondary">
                Explore communities
              </Atom.ButtonLink>
            }
          />
        }
      />
    </div>
  );
}

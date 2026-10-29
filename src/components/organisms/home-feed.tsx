"use client";

import { Select } from "antd";
import { ChevronDown, CircleCheck } from "lucide-react";
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
import { DiscordSetupReminder, useUnfinishedDiscord } from "./discord-setup";
import { PostComposer } from "./post-composer";
import { PostList } from "./post-list";
import { OnboardingChecklist, OnboardingTour } from "./onboarding";
import { TipOfTheWeek } from "./tip-of-the-week";

type Destination = "wall" | number;

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

  async function handlePost(content: string, linkUrl?: string) {
    const { token } = useAuthStore.getState();
    if (!token || !profile) throw new Error("Please log in again.");

    const post = community
      ? await createPost(token, community.id, content, linkUrl)
      : await createWallPost(token, profile.username, content, linkUrl);
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
      {profile && (
        <div data-tour="composer">
        <PostComposer
          linkPreview
          onPost={handlePost}
          placeholder={community ? "Share an update with your community…" : "What’s on your mind?"}
          target={
            <div className="flex items-center gap-3">
              {community ? (
                <span
                  aria-hidden
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-divider bg-rail-item font-display text-[17.6px] leading-none font-bold"
                >
                  <Atom.CommunityIcon name={community.name} src={community.iconUrl} />
                </span>
              ) : (
                <Atom.Avatar
                  size="sm"
                  label={profile.username}
                  src={profile.avatarUrl}
                  seed={profile.userId}
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs text-muted uppercase">Post to</span>
                <Select<Destination>
                  aria-label="Post to"
                  variant="borderless"
                  size="small"
                  value={community?.id ?? "wall"}
                  onChange={setSelected}
                  suffixIcon={<ChevronDown size={12} />}
                  options={[
                    { value: "wall", label: "Your wall", iconUrl: profile.avatarUrl },
                    ...communities.map((item) => ({
                      value: item.id,
                      label: item.name,
                      iconUrl: item.iconUrl,
                    })),
                  ]}
                  optionRender={({ data }) => (
                    <span className="flex items-center gap-2">
                      {data.value === "wall" ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                          <Atom.Avatar
                            size="xs"
                            label={profile.username}
                            src={profile.avatarUrl}
                            seed={profile.userId}
                          />
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rail-item font-display text-[13px] leading-none font-bold"
                        >
                          <Atom.CommunityIcon name={String(data.label)} src={data.iconUrl} />
                        </span>
                      )}
                      <span className="truncate">{data.label}</span>
                    </span>
                  )}
                  popupMatchSelectWidth={false}
                  className="-ml-[7px] w-fit max-w-full text-[13px] font-semibold"
                />
              </div>
            </div>
          }
        />
        </div>
      )}
      <PostList
        showCommunity
        feed={feed}
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

"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  getFacebookCharts,
  getFacebookPosts,
  getFacebookReleases,
  postChartsToFacebook,
  postReleaseToFacebook,
  updateFacebookCharts,
  updateFacebookReleases,
  type FacebookChartsStatus,
  type FacebookPostKind,
  type FacebookPostsStatus,
  type FacebookReleasesStatus,
} from "@/lib/api";
import { formatChangelogDate } from "@/lib/changelog";
import { useAuthStore } from "@/stores/auth-store";
import { FacebookAutoPost, FacebookNotSetUp } from "./facebook-auto-post";
import { FacebookPostSetting } from "./facebook-post-settings";
import { OAuthConnectionRow } from "./oauth-buttons";

const WEEKLY: FacebookPostKind[] = ["spotlight", "debate", "most-added", "hashtags", "community", "tip"];
const SEASONAL: FacebookPostKind[] = ["season", "coming"];

function chartWeek(week: string) {
  const [year, number] = week.split("-W");
  return `week ${Number(number)}, ${year}`;
}

function releaseName({ date, version }: { date: string; version: string | null }) {
  return version ?? formatChangelogDate(date);
}

function PostList({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-divider [&>*]:flex [&>*]:flex-col [&>*]:gap-5 [&>*]:py-6 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
      {children}
    </div>
  );
}

function ScheduledPosts({
  kinds,
  status,
  error,
  onChange,
}: {
  kinds: FacebookPostKind[];
  status: FacebookPostsStatus | null;
  error: string | null;
  onChange: (status: FacebookPostsStatus) => void;
}) {
  if (error) return <Atom.ErrorMessage>{error}</Atom.ErrorMessage>;
  if (!status) return <Atom.Loader />;
  return kinds.map((kind) => (
    <div key={kind}>
      <FacebookPostSetting kind={kind} status={status} onChange={onChange} />
    </div>
  ));
}

export function WebsiteSettings() {
  const [charts, setCharts] = useState<FacebookChartsStatus | null>(null);
  const [chartsError, setChartsError] = useState<string | null>(null);
  const [releases, setReleases] = useState<FacebookReleasesStatus | null>(null);
  const [releasesError, setReleasesError] = useState<string | null>(null);
  const [posts, setPosts] = useState<FacebookPostsStatus | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getFacebookCharts(token)
      .then(setCharts)
      .catch((e: Error) => setChartsError(e.message));
    getFacebookReleases(token)
      .then(setReleases)
      .catch((e: Error) => setReleasesError(e.message));
    getFacebookPosts(token)
      .then(setPosts)
      .catch((e: Error) => setPostsError(e.message));
  }, []);

  return (
    <Molecule.SettingsSection
      title="Facebook"
      description="Everything Orbis posts to its Facebook Page on its own, and the Page cover."
    >
      {chartsError ? (
        <Atom.ErrorMessage>{chartsError}</Atom.ErrorMessage>
      ) : !charts ? (
        <Atom.Loader />
      ) : charts.configured ? (
        <>
          <OAuthConnectionRow
            provider="facebook"
            title={charts.page?.name ?? "Facebook Page"}
            status={
              charts.pageError ? (
                <span className="whitespace-normal text-danger">
                  Couldn’t check the Page: {charts.pageError}
                </span>
              ) : (
                charts.page && (
                  <span className="whitespace-normal">
                    {`Page ID ${charts.page.id}`}
                    {charts.page.followers !== null &&
                      ` · ${charts.page.followers.toLocaleString("en-US")} followers`}
                    {charts.followersError && (
                      <span className="text-danger">
                        {` · Couldn’t read followers: ${charts.followersError}`}
                      </span>
                    )}
                  </span>
                )
              )
            }
          />
          <div className="flex flex-col divide-y divide-divider">
            <Molecule.SettingsPart
              title="Page cover"
              description="The cover photo at the top of the Orbis Facebook Page."
            >
              <ScheduledPosts kinds={["cover"]} status={posts} error={postsError} onChange={setPosts} />
            </Molecule.SettingsPart>
            <Molecule.SettingsPart
              title="Weekly posts"
              description="A different post each day of the week. The charts go out on Monday at 8:00 AM Philippine time, and the rest at 12:00 PM."
            >
              <PostList>
                <div>
                  <FacebookAutoPost
                    switches={[
                      {
                        key: "charts",
                        label: "Weekly charts on Mondays",
                        description:
                          "The anime, manga and games charts, each in its own post at the start of every chart week, with a link to its discussion on Orbis.",
                        enabled: charts.enabled,
                        update: updateFacebookCharts,
                      },
                    ]}
                    lastPost={
                      charts.lastPost && { ...charts.lastPost, label: chartWeek(charts.lastPost.week) }
                    }
                    noPost="No automatic post yet."
                    confirmTitle="Post this week’s charts to Facebook?"
                    confirmDescription="Posts the anime, manga and games charts to the Orbis Facebook Page now, one post each. Monday’s posts still go out."
                    postedMessage="Posted this week’s charts to Facebook."
                    post={postChartsToFacebook}
                    load={getFacebookCharts}
                    onChange={setCharts}
                  />
                </div>
                <ScheduledPosts kinds={WEEKLY} status={posts} error={postsError} onChange={setPosts} />
              </PostList>
            </Molecule.SettingsPart>
            <Molecule.SettingsPart
              title="Seasonal posts"
              description="Posts about each new season, at 12:00 PM Philippine time."
            >
              <PostList>
                <ScheduledPosts kinds={SEASONAL} status={posts} error={postsError} onChange={setPosts} />
              </PostList>
            </Molecule.SettingsPart>
            <Molecule.SettingsPart
              title="What’s new in Orbis"
              description="The changes in each Orbis update, with a link to them in the changelog."
            >
              {releasesError ? (
                <Atom.ErrorMessage>{releasesError}</Atom.ErrorMessage>
              ) : !releases ? (
                <Atom.Loader />
              ) : (
                <FacebookAutoPost
                  switches={[
                    {
                      key: "releases",
                      label: "Post what’s new after each update",
                      description:
                        "When a new day is added to the changelog, posts an image of its changes with the version number, plus a link to the changelog. Turning it on posts anything newer than the last post right away, or the newest update if nothing’s been posted yet.",
                      enabled: releases.enabled,
                      update: updateFacebookReleases,
                    },
                  ]}
                  lastPost={
                    releases.lastPost && {
                      ...releases.lastPost,
                      label: releaseName(releases.lastPost),
                    }
                  }
                  noPost="No update posted yet."
                  confirmTitle="Post the latest update to Facebook?"
                  confirmDescription="Posts the newest changelog update that isn’t on Facebook yet."
                  postedMessage="Posted the latest update to Facebook."
                  post={postReleaseToFacebook}
                  load={getFacebookReleases}
                  onChange={setReleases}
                />
              )}
            </Molecule.SettingsPart>
          </div>
          <p className="text-xs text-muted">
            Milestone posts are in the{" "}
            <Link
              href="/admin?tab=milestones"
              className="focus-ring rounded-sm font-semibold text-accent hover:underline"
            >
              Milestones
            </Link>{" "}
            tab.
          </p>
        </>
      ) : (
        <FacebookNotSetUp />
      )}
    </Molecule.SettingsSection>
  );
}

"use client";

import { App, Popconfirm, Switch } from "antd";
import { ExternalLink, Send } from "lucide-react";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  getFacebookCharts,
  getFacebookMilestones,
  getFacebookReleases,
  postChartsToFacebook,
  postMilestoneToFacebook,
  postReleaseToFacebook,
  updateFacebookCharts,
  updateFacebookMilestones,
  updateFacebookReleases,
  type FacebookChartsStatus,
  type FacebookMilestonesStatus,
  type FacebookReleasesStatus,
  type MilestoneCommunity,
} from "@/lib/api";
import { useReadOnly } from "@/lib/read-only";
import { formatChangelogDate } from "@/lib/changelog";
import { longDate } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { OAuthConnectionRow } from "./oauth-buttons";

function chartWeek(week: string) {
  const [year, number] = week.split("-W");
  return `week ${Number(number)}, ${year}`;
}

function releaseName({ date, version }: { date: string; version: string | null }) {
  return version ?? formatChangelogDate(date);
}

function milestoneName({
  members,
  community,
}: {
  members: number;
  community: MilestoneCommunity | null;
}) {
  return `${community?.name ?? "Orbis"}, ${members.toLocaleString("en-US")} members`;
}

function FacebookAutoPost<S>({
  label,
  description,
  enabled,
  lastPost,
  noPost,
  confirmTitle,
  confirmDescription,
  postedMessage,
  update,
  post,
  load,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  lastPost: { label: string; postId: string | null; postedAt: string } | null;
  noPost: string;
  confirmTitle: string;
  confirmDescription: string;
  postedMessage: string;
  update: (token: string, enabled: boolean) => Promise<S>;
  post: (token: string) => Promise<unknown>;
  load: (token: string) => Promise<S>;
  onChange: (status: S) => void;
}) {
  const { message } = App.useApp();
  const readOnly = useReadOnly();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      onChange(await update(token, next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function postNow() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    try {
      await post(token);
      message.success(postedMessage);
      void load(token).then(onChange, () => undefined);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Couldn’t post to Facebook.");
    }
  }

  return (
    <>
      <Molecule.SettingsRow label={label} description={description}>
        <Molecule.ReadOnlyGate action="change automatic posts">
          <Switch checked={enabled} loading={saving} onChange={toggle} />
        </Molecule.ReadOnlyGate>
      </Molecule.SettingsRow>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs text-muted">
            {lastPost ? `Last posted: ${lastPost.label} · ${longDate(lastPost.postedAt)}` : noPost}
          </p>
          {lastPost?.postId && (
            <a
              href={`https://www.facebook.com/${lastPost.postId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex w-fit items-center gap-1.5 rounded-sm text-[13px] font-semibold text-accent hover:underline"
            >
              View on Facebook
              <ExternalLink size={14} aria-hidden />
            </a>
          )}
        </div>
        <Popconfirm
          title={confirmTitle}
          description={<span className="block max-w-64">{confirmDescription}</span>}
          okText="Post"
          disabled={readOnly}
          onConfirm={postNow}
        >
          <Atom.Button
            size="small"
            variant="secondary"
            icon={<Send size={12} />}
            disabled={readOnly}
          >
            Post now
          </Atom.Button>
        </Popconfirm>
      </div>
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
    </>
  );
}

export function WebsiteSettings() {
  const [charts, setCharts] = useState<FacebookChartsStatus | null>(null);
  const [chartsError, setChartsError] = useState<string | null>(null);
  const [releases, setReleases] = useState<FacebookReleasesStatus | null>(null);
  const [releasesError, setReleasesError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<FacebookMilestonesStatus | null>(null);
  const [milestonesError, setMilestonesError] = useState<string | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getFacebookCharts(token)
      .then(setCharts)
      .catch((e: Error) => setChartsError(e.message));
    getFacebookReleases(token)
      .then(setReleases)
      .catch((e: Error) => setReleasesError(e.message));
    getFacebookMilestones(token)
      .then(setMilestones)
      .catch((e: Error) => setMilestonesError(e.message));
  }, []);

  return (
    <Molecule.SettingsSection
      title="Facebook"
      description="Automatic posts to the Orbis Facebook Page."
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
                charts.page && `Page ID ${charts.page.id}`
              )
            }
          />
          <div className="flex flex-col divide-y divide-divider">
            <Molecule.SettingsPart
              title="Weekly charts"
              description="The trending anime, manga and games, with a link to each chart’s discussion on Orbis."
            >
              <FacebookAutoPost
                label="Post the weekly charts every Monday"
                description="The anime, manga and games charts each get their own post at the start of every chart week."
                enabled={charts.enabled}
                lastPost={
                  charts.lastPost && { ...charts.lastPost, label: chartWeek(charts.lastPost.week) }
                }
                noPost="No automatic post yet."
                confirmTitle="Post this week’s charts to Facebook?"
                confirmDescription="Posts the anime, manga and games charts to the Orbis Facebook Page now, one post each. Monday’s posts still go out."
                postedMessage="Posted this week’s charts to Facebook."
                update={updateFacebookCharts}
                post={postChartsToFacebook}
                load={getFacebookCharts}
                onChange={setCharts}
              />
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
                  label="Post what’s new after each update"
                  description="When a new day is added to the changelog, posts an image of its changes with the version number, plus a link to the changelog. Turning it on posts anything newer than the last post right away, or the newest update if nothing’s been posted yet."
                  enabled={releases.enabled}
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
                  update={updateFacebookReleases}
                  post={postReleaseToFacebook}
                  load={getFacebookReleases}
                  onChange={setReleases}
                />
              )}
            </Molecule.SettingsPart>
            <Molecule.SettingsPart
              title="Member milestones"
              description="Celebrates when Orbis or a public community reaches a new member count."
            >
              {milestonesError ? (
                <Atom.ErrorMessage>{milestonesError}</Atom.ErrorMessage>
              ) : !milestones ? (
                <Atom.Loader />
              ) : (
                <FacebookAutoPost
                  label="Post member milestones"
                  description="When Orbis or a public community reaches 10, 25, 50, 100, 250, 500 or 1,000 members and so on, posts an image of the milestone with a link. Only milestones reached while this is on are posted."
                  enabled={milestones.enabled}
                  lastPost={
                    milestones.lastPost && {
                      ...milestones.lastPost,
                      label: milestoneName(milestones.lastPost),
                    }
                  }
                  noPost="No milestone posted yet."
                  confirmTitle="Post the latest milestone to Facebook?"
                  confirmDescription="Posts the most recent milestone that isn’t on Facebook yet, even one reached before this was turned on."
                  postedMessage="Posted the latest milestone to Facebook."
                  update={updateFacebookMilestones}
                  post={postMilestoneToFacebook}
                  load={getFacebookMilestones}
                  onChange={setMilestones}
                />
              )}
            </Molecule.SettingsPart>
          </div>
        </>
      ) : (
        <>
          <OAuthConnectionRow provider="facebook" title="Facebook Page" status="Not set up" />
          <p className="text-xs text-muted">
            Add <code className="rounded bg-rail-item px-1">FACEBOOK_PAGE_ID</code> and{" "}
            <code className="rounded bg-rail-item px-1">FACEBOOK_PAGE_TOKEN</code> to the server’s
            settings, then restart the server.
          </p>
        </>
      )}
    </Molecule.SettingsSection>
  );
}

"use client";

import { App, InputNumber } from "antd";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  getFacebookMilestones,
  postMilestoneToFacebook,
  updateFacebookMilestones,
  type FacebookMilestonesStatus,
  type MilestoneKind,
  type MilestoneProgress,
  type PostedMilestone,
} from "@/lib/api";
import { useReadOnly } from "@/lib/read-only";
import { longDate } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { FacebookAutoPost, FacebookNotSetUp, FacebookPostLink } from "./website-settings";

const DESCRIPTION =
  "Posts an image to the Orbis Facebook Page when a count reaches 10, 25, 50, 100, 250, 500, 1,000 and so on. Each switch only posts milestones reached after it’s turned on.";

const GOAL = { min: 10, max: 1_000_000_000 };
const ALL_LABELS = 8;

const switches: { kind: MilestoneKind; label: string; description: string }[] = [
  {
    kind: "followers",
    label: "Facebook followers",
    description: "When the Orbis Facebook Page reaches a new follower count.",
  },
  {
    kind: "members",
    label: "Orbis members",
    description: "When Orbis reaches a new member count.",
  },
  {
    kind: "communities",
    label: "Community members",
    description: "When a public community reaches a new member count.",
  },
];

const number = (value: number) => value.toLocaleString("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact" });

function milestoneName({ kind, milestone, community }: PostedMilestone) {
  return kind === "followers"
    ? `Facebook Page, ${number(milestone)} followers`
    : `${community?.name ?? "Orbis"}, ${number(milestone)} members`;
}

function trackStops(goal: number) {
  const stops: number[] = [];
  for (let base = 10; base < goal; base *= 10) {
    for (const step of [1, 2.5, 5]) {
      if (base * step < goal) stops.push(base * step);
    }
  }
  return [...stops, goal];
}

function filled(count: number, stops: number[]) {
  const index = stops.findIndex((stop) => count < stop);
  if (index === -1) return 1;
  const low = index === 0 ? 0 : stops[index - 1];
  return (index + (count - low) / (stops[index] - low)) / stops.length;
}

function MilestoneTrack({ count, stops }: { count: number | null; stops: number[] }) {
  const tickAt = (index: number) => `${((index + 1) / stops.length) * 100}%`;
  const labeled = (stop: number, index: number) =>
    stops.length <= ALL_LABELS || index === stops.length - 1 || /^10*$/.test(String(stop));

  return (
    <div aria-hidden className="flex flex-col gap-1">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-rail-item">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${(count === null ? 0 : filled(count, stops)) * 100}%` }}
        />
        {stops.slice(0, -1).map((milestone, index) => (
          <span
            key={milestone}
            className={`absolute inset-y-0 w-px ${
              count !== null && count >= milestone ? "bg-surface/70" : "bg-muted/40"
            }`}
            style={{ left: tickAt(index) }}
          />
        ))}
      </div>
      <div className="relative h-3.5 text-[10px] leading-none text-muted">
        {stops.map(
          (milestone, index) =>
            labeled(milestone, index) && (
              <span
                key={milestone}
                className={`absolute ${index === stops.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
                style={{ left: tickAt(index) }}
              >
                {compact.format(milestone)}
              </span>
            ),
        )}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  progress,
  stops,
  empty,
  prefix,
}: {
  label: string;
  progress: MilestoneProgress | null;
  stops: number[];
  empty: string;
  prefix?: string;
}) {
  const count = progress?.count ?? null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted">
          {progress && count !== null
            ? `${prefix ? `${prefix} · ` : ""}${number(count)} · next ${number(progress.next)}`
            : empty}
        </span>
      </div>
      <MilestoneTrack count={count} stops={stops} />
    </div>
  );
}

function GoalInput({
  goal,
  onChange,
}: {
  goal: number;
  onChange: (status: FacebookMilestonesStatus) => void;
}) {
  const { message } = App.useApp();
  const readOnly = useReadOnly();
  const [draft, setDraft] = useState<number | null>(goal);
  const [saving, setSaving] = useState(false);

  async function save() {
    const next =
      draft === null ? goal : Math.min(GOAL.max, Math.max(GOAL.min, Math.round(draft)));
    setDraft(next);
    if (next === goal) return;
    const { token } = useAuthStore.getState();
    if (!token) return;
    setSaving(true);
    try {
      onChange(await updateFacebookMilestones(token, { goal: next }));
    } catch (e) {
      setDraft(goal);
      message.error(e instanceof Error ? e.message : "Couldn’t save the goal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <InputNumber
      size="small"
      min={GOAL.min}
      max={GOAL.max}
      precision={0}
      value={draft}
      disabled={readOnly || saving}
      controls={false}
      aria-label="Goal"
      formatter={(value) => (value === undefined ? "" : number(Number(value)))}
      parser={(value) => Number(value?.replace(/,/g, "") || 0)}
      onChange={setDraft}
      onPressEnter={save}
      onBlur={save}
      className="w-32"
    />
  );
}

export function MilestoneSettings() {
  const [status, setStatus] = useState<FacebookMilestonesStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getFacebookMilestones(token)
      .then(setStatus)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error || !status || !status.configured) {
    return (
      <Molecule.SettingsSection title="Milestones" description={DESCRIPTION}>
        {error ? (
          <Atom.ErrorMessage>{error}</Atom.ErrorMessage>
        ) : !status ? (
          <Atom.Loader />
        ) : (
          <FacebookNotSetUp />
        )}
      </Molecule.SettingsSection>
    );
  }

  const { progress, recentPosts } = status;
  const [lastPost] = recentPosts;
  const stops = trackStops(status.goal);

  return (
    <>
      <Molecule.SettingsSection title="Milestones" description={DESCRIPTION}>
        <FacebookAutoPost
          switches={switches.map(({ kind, label, description }) => ({
            key: kind,
            label,
            description,
            enabled: status[kind],
            update: (token: string, enabled: boolean) =>
              updateFacebookMilestones(token, { [kind]: enabled }),
          }))}
          lastPost={lastPost ? { ...lastPost, label: milestoneName(lastPost) } : null}
          noPost="No milestone posted yet."
          confirmTitle="Post the latest milestone to Facebook?"
          confirmDescription="Posts the most recent milestone that isn’t on Facebook yet, from the switches that are on, even one reached before they were turned on."
          postedMessage="Posted the latest milestone to Facebook."
          post={postMilestoneToFacebook}
          load={getFacebookMilestones}
          onChange={setStatus}
        />
      </Molecule.SettingsSection>
      <Molecule.SettingsSection
        title="Progress"
        description="Each line is a milestone on the way to the goal. Community members follows the biggest public community."
      >
        <Molecule.SettingsRow label="Goal" description="Where the bars end. Raise it as Orbis grows.">
          <GoalInput goal={status.goal} onChange={setStatus} />
        </Molecule.SettingsRow>
        <div className="flex flex-col gap-5">
          <ProgressRow
            label="Facebook followers"
            progress={progress.followers}
            stops={stops}
            empty="Can’t read the follower count right now"
          />
          <ProgressRow
            label="Orbis members"
            progress={progress.members}
            stops={stops}
            empty="No members yet"
          />
          <ProgressRow
            label="Community members"
            progress={progress.communities}
            stops={stops}
            prefix={progress.communities?.community.name}
            empty="No public communities yet"
          />
        </div>
      </Molecule.SettingsSection>
      <Molecule.SettingsSection title="Recent milestone posts">
        {recentPosts.length === 0 ? (
          <p className="text-sm text-muted">No milestone posted yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-divider">
            {recentPosts.map((post) => (
              <li
                key={`${post.kind}-${post.community?.id ?? ""}-${post.milestone}`}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-semibold">{milestoneName(post)}</span>
                  <span className="text-xs text-muted">{longDate(post.postedAt)}</span>
                </div>
                {post.postId ? (
                  <FacebookPostLink postId={post.postId} />
                ) : (
                  <span className="text-xs text-muted">Not confirmed by Facebook</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Molecule.SettingsSection>
    </>
  );
}

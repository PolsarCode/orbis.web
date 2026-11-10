"use client";

import { App, Popconfirm, Switch } from "antd";
import { ExternalLink, Send } from "lucide-react";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  getFacebookCharts,
  postChartsToFacebook,
  updateFacebookCharts,
  type FacebookChartsStatus,
} from "@/lib/api";
import { useReadOnly } from "@/lib/read-only";
import { longDate } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { OAuthConnectionRow } from "./oauth-buttons";

function chartWeek(week: string) {
  const [year, number] = week.split("-W");
  return `week ${Number(number)}, ${year}`;
}

function FacebookStatus({
  status,
  onChange,
}: {
  status: FacebookChartsStatus;
  onChange: (status: FacebookChartsStatus) => void;
}) {
  const { message } = App.useApp();
  const readOnly = useReadOnly();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { page, pageError, enabled, lastPost } = status;

  async function toggle(next: boolean) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      onChange(await updateFacebookCharts(token, next));
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
      await postChartsToFacebook(token);
      message.success("Posted this week’s charts to Facebook.");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Couldn’t post to Facebook.");
    }
  }

  return (
    <>
      <OAuthConnectionRow
        provider="facebook"
        title={page?.name ?? "Facebook Page"}
        status={
          pageError ? (
            <span className="whitespace-normal text-danger">
              Couldn’t check the Page: {pageError}
            </span>
          ) : (
            page && `Page ID ${page.id}`
          )
        }
      />
      <Molecule.SettingsRow
        label="Post the weekly charts every Monday"
        description="The anime, manga and games charts each get their own post at the start of every chart week."
      >
        <Molecule.ReadOnlyGate action="change automatic posts">
          <Switch checked={enabled} loading={saving} onChange={toggle} />
        </Molecule.ReadOnlyGate>
      </Molecule.SettingsRow>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs text-muted">
            {lastPost
              ? `Last posted: ${chartWeek(lastPost.week)} · ${longDate(lastPost.postedAt)}`
              : "No automatic post yet."}
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
          title="Post this week’s charts to Facebook?"
          description={
            <span className="block max-w-64">
              Posts the anime, manga and games charts to the Orbis Facebook Page now, one post
              each. Monday’s posts still go out.
            </span>
          }
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
  const [status, setStatus] = useState<FacebookChartsStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getFacebookCharts(token)
      .then(setStatus)
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  return (
    <Molecule.SettingsSection
      title="Facebook"
      description="The weekly charts are posted to the Orbis Facebook Page."
    >
      {loadError ? (
        <Atom.ErrorMessage>{loadError}</Atom.ErrorMessage>
      ) : !status ? (
        <Atom.Loader />
      ) : status.configured ? (
        <FacebookStatus status={status} onChange={setStatus} />
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

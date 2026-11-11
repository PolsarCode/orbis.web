"use client";

import { App, Popconfirm, Switch } from "antd";
import { ExternalLink, Send } from "lucide-react";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { useReadOnly } from "@/lib/read-only";
import { longDate } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { OAuthConnectionRow } from "./oauth-buttons";

type AutoPostSwitch<S> = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  update: (token: string, enabled: boolean) => Promise<S>;
};

export function FacebookPostLink({ postId }: { postId: string }) {
  return (
    <a
      href={`https://www.facebook.com/${postId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring flex w-fit items-center gap-1.5 rounded-sm text-[13px] font-semibold text-accent hover:underline"
    >
      View on Facebook
      <ExternalLink size={14} aria-hidden />
    </a>
  );
}

export function FacebookNotSetUp() {
  return (
    <>
      <OAuthConnectionRow provider="facebook" title="Facebook Page" status="Not set up" />
      <p className="text-xs text-muted">
        Add <code className="rounded bg-rail-item px-1">FACEBOOK_PAGE_ID</code> and{" "}
        <code className="rounded bg-rail-item px-1">FACEBOOK_PAGE_TOKEN</code> to the server’s
        settings, then restart the server.
      </p>
    </>
  );
}

export function FacebookAutoPost<S>({
  switches,
  lastPost,
  noPost,
  confirmTitle,
  confirmDescription,
  postedMessage,
  post,
  load,
  onChange,
}: {
  switches: AutoPostSwitch<S>[];
  lastPost: { label: string; postId: string | null; postedAt: string } | null;
  noPost: string;
  confirmTitle: string;
  confirmDescription: string;
  postedMessage: string;
  post: (token: string) => Promise<unknown>;
  load: (token: string) => Promise<S>;
  onChange: (status: S) => void;
}) {
  const { message } = App.useApp();
  const readOnly = useReadOnly();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle({ key, update }: AutoPostSwitch<S>, next: boolean) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setSaving(key);
    setError(null);
    try {
      onChange(await update(token, next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(null);
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
      {switches.map((item) => (
        <Molecule.SettingsRow key={item.key} label={item.label} description={item.description}>
          <Molecule.ReadOnlyGate action="change automatic posts">
            <Switch
              checked={item.enabled}
              loading={saving === item.key}
              disabled={saving !== null && saving !== item.key}
              onChange={(next) => toggle(item, next)}
            />
          </Molecule.ReadOnlyGate>
        </Molecule.SettingsRow>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs text-muted">
            {lastPost ? `Last posted: ${lastPost.label} · ${longDate(lastPost.postedAt)}` : noPost}
          </p>
          {lastPost?.postId && <FacebookPostLink postId={lastPost.postId} />}
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

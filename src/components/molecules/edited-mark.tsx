"use client";

import { useEffect, useState } from "react";
import * as Atom from "@atom";
import { getEditHistory, type EditHistory, type EditTarget } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { ContentBody } from "./content-body";
import { Dialog } from "./dialog";
import { ModalHeader } from "./modal-header";
import { RetryAlert } from "./retry-alert";

type EditedTarget = EditTarget & { createdAt: string };

const nouns: Record<EditTarget["type"], string> = {
  post: "Post",
  comment: "Comment",
  forumPost: "Forum post",
};

export function EditedMark({
  editedAt,
  target,
}: {
  editedAt?: string | null;
  target?: EditedTarget;
}) {
  const [open, setOpen] = useState(false);
  if (!editedAt) return null;

  const title = `Edited ${new Date(editedAt).toLocaleString()}`;
  if (!target) return <span title={title}>· edited</span>;

  return (
    <span
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        title={title}
        aria-label="Edited, show edit history"
        onClick={() => setOpen(true)}
        className="group focus-ring rounded-sm"
      >
        · <span className="group-hover:underline">edited</span>
      </button>
      <Dialog open={open} width={560} onCancel={() => setOpen(false)}>
        <div className="flex flex-col gap-6">
          <ModalHeader eyebrow={nouns[target.type]} title="Edit history" />
          <VersionList target={target} />
        </div>
      </Dialog>
    </span>
  );
}

function VersionList({ target }: { target: EditedTarget }) {
  const { type, id, createdAt } = target;
  const communityId = target.type === "forumPost" ? target.communityId : 0;
  const [versions, setVersions] = useState<EditHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const { token } = useAuthStore.getState();

    let current = true;
    getEditHistory(token, type === "forumPost" ? { type, id, communityId } : { type, id })
      .then((result) => {
        if (current) setVersions(result);
      })
      .catch((e) => {
        if (current) setError(e instanceof Error ? e.message : "Could not load the edit history.");
      });
    return () => {
      current = false;
    };
  }, [type, id, communityId, attempt]);

  if (error) {
    return (
      <RetryAlert
        onRetry={() => {
          setError(null);
          setAttempt((count) => count + 1);
        }}
      >
        {error}
      </RetryAlert>
    );
  }

  if (!versions) {
    return (
      <div className="flex min-h-24">
        <Atom.Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col divide-y divide-divider">
        {versions.map((version, index) => {
          const original =
            index > 0 &&
            index === versions.length - 1 &&
            new Date(version.createdAt).getTime() === new Date(createdAt).getTime();
          const label = index === 0 ? "Current" : original ? "Original" : null;

          return (
            <li key={index} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {label && (
                  <Atom.Pill size="xs" tone={index === 0 ? "accent" : "neutral"}>
                    {label}
                  </Atom.Pill>
                )}
                <time dateTime={version.createdAt}>
                  {new Date(version.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </p>
              <ContentBody
                content={version.content}
                linkUrl={version.linkUrl}
                spoiler={version.spoiler}
              />
            </li>
          );
        })}
      </ol>
      {versions.length === 1 && (
        <p className="text-xs text-muted">Earlier versions weren’t saved.</p>
      )}
    </div>
  );
}

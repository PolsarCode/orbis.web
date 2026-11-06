"use client";

import { App } from "antd";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  getCommunityPost,
  getMediaPost,
  getProfileActivity,
  getProfilePost,
  type FeedEntry,
  type QuotedItem,
  type QuotedPost,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { attachmentLabel } from "@/lib/links";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { ActivitySummary } from "./activity-card";
import { DiscussionModal } from "./discussion-modal";

type AvailableQuote = Extract<QuotedItem, { available: true }>;

function loadOriginal(quote: AvailableQuote): Promise<FeedEntry> {
  const { token } = useAuthStore.getState();
  if (quote.type === "activity") {
    return getProfileActivity(token, quote.activity.author.username, quote.activity.id);
  }
  const { post } = quote;
  if (post.community) return getCommunityPost(token, post.community.id, post.id);
  if (post.media) return getMediaPost(token, post.media.type, post.media.sourceId, post.id);
  return getProfilePost(token, (post.wallUser ?? post.author).username, post.id);
}

export function QuoteEmbed({
  quote,
  interactive = true,
}: {
  quote: QuotedItem;
  interactive?: boolean;
}) {
  const { message } = App.useApp();
  const [original, setOriginal] = useState<FeedEntry | null>(null);
  const [opening, setOpening] = useState(false);

  if (!quote.available) {
    return (
      <p className="rounded-lg border border-dashed border-divider bg-rail-item px-3 py-2 text-sm text-muted">
        This post isn’t available
      </p>
    );
  }

  const available = quote;

  function open() {
    if (opening) return;
    setOpening(true);
    loadOriginal(available)
      .then(setOriginal)
      .catch((error: Error) => message.info(error.message))
      .finally(() => setOpening(false));
  }

  return (
    <Molecule.HiddenGate
      hiddenBecause={
        quote.type === "post" ? quote.post.hiddenBecause : quote.activity.hiddenBecause
      }
    >
      <div onClick={interactive ? (event) => event.stopPropagation() : undefined}>
        <div
          tabIndex={interactive ? 0 : undefined}
          aria-busy={opening || undefined}
          onClick={(event) => {
            if (interactive && !(event.target as HTMLElement).closest("a, button")) open();
          }}
          onKeyDown={(event) => {
            if (interactive && event.key === "Enter" && event.target === event.currentTarget) open();
          }}
          className={`flex min-w-0 flex-col gap-2 rounded-lg border border-divider p-3 ${
            interactive ? "focus-ring cursor-pointer transition-colors hover:bg-rail-item/30" : ""
          }`}
        >
          {quote.type === "activity" ? (
            <ActivitySummary activity={quote.activity} />
          ) : (
            <QuotedPostBody post={quote.post} />
          )}
        </div>
        {interactive && (
          <DiscussionModal
            item={original}
            onClose={() => setOriginal(null)}
            onChange={setOriginal}
            onDelete={() => setOriginal(null)}
          />
        )}
      </div>
    </Molecule.HiddenGate>
  );
}

function QuotedPostBody({ post }: { post: QuotedPost }) {
  const name = displayName(post.author);
  const wallUser = post.wallUser && post.wallUser.id !== post.author.id ? post.wallUser : null;
  const where =
    post.community?.name ?? (wallUser ? `${displayName(wallUser)}’s wall` : post.media?.title);

  return (
    <>
      <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
        <Atom.Avatar size="xs" label={name} src={post.author.avatarUrl} seed={post.author.id} />
        <Molecule.UserLink
          username={post.author.username}
          className="min-w-0 truncate text-sm font-semibold text-foreground"
        >
          {name}
        </Molecule.UserLink>
        {where && (
          <>
            <span aria-hidden>·</span>
            <span className="min-w-0 truncate">{where}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <time
          dateTime={post.createdAt}
          title={new Date(post.createdAt).toLocaleString()}
          className="shrink-0"
        >
          {timeAgo(post.createdAt)}
        </time>
      </p>
      <Molecule.SpoilerGate spoiler={post.spoiler}>
        {post.content && (
          <div
            className="rich-text line-clamp-4 text-sm"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        )}
        {post.linkUrl && (
          <p className="text-[13px] text-muted italic">{attachmentLabel(post.linkUrl)}</p>
        )}
      </Molecule.SpoilerGate>
    </>
  );
}

"use client";

import { Pin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as Molecule from "@molecule";
import type { FeedEntry } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { activityText, mediaPath, progressText } from "@/lib/library";
import { timeAgo } from "@/lib/time";
import { toggleLike } from "@/lib/votes";
import { useLikeBlockedReason } from "./post-card";
import { HiddenNotice, ReportButton } from "./report-content";

export function CompactFeedItem({
  item,
  showCommunity,
  onOpen,
  onChange,
}: {
  item: FeedEntry;
  showCommunity: boolean;
  onOpen: () => void;
  onChange: (item: FeedEntry) => void;
}) {
  const community = item.type !== "activity" ? item.community : null;
  const likeBlockedReason = useLikeBlockedReason(item.type === "post" ? item : null);
  const wallUser =
    item.type === "post" && item.wallUser?.id !== item.author.id
      ? item.wallUser
      : null;
  const [verb, suffix] =
    item.type === "activity"
      ? item.progress
        ? progressText(item.progress, item.media.type)
        : activityText(item.status, item.media.type)
      : ["", ""];

  return (
    <article
      className="flex min-w-0 cursor-pointer items-start gap-3 px-3 py-3 transition-colors hover:bg-rail-item/30 sm:px-4"
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("a, button")) onOpen();
      }}
    >
      <Molecule.AuthorAvatar
        author={item.author}
        community={showCommunity && community ? community : undefined}
        wallUser={wallUser ?? undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <header className="flex min-w-0 items-start justify-between gap-2">
          <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
            {item.type === "post" && item.pinned && (
              <>
                <span className="flex items-center gap-1 font-semibold text-accent">
                  <Pin size={12} aria-hidden />
                  Pinned
                </span>
                <span aria-hidden>·</span>
              </>
            )}
            {showCommunity && community && (
              <Link
                href={`/communities/${community.id}`}
                className="focus-ring max-w-full truncate rounded-sm font-semibold text-foreground hover:underline"
              >
                {community.name}
              </Link>
            )}
            <Molecule.UserLink
              username={item.author.username}
              className="max-w-full truncate"
            >
              {displayName(item.author)}
            </Molecule.UserLink>
            {wallUser && (
              <>
                <span aria-hidden>→</span>
                <Molecule.UserLink
                  username={wallUser.username}
                  className="max-w-full truncate"
                >
                  {displayName(wallUser)}
                </Molecule.UserLink>
              </>
            )}
            <span aria-hidden>·</span>
            <time
              dateTime={item.createdAt}
              title={new Date(item.createdAt).toLocaleString()}
            >
              {timeAgo(item.createdAt)}
            </time>
          </p>
          {item.type !== "activity" && (
            <ReportButton
              type={item.type}
              id={item.id}
              ownerId={item.author.id}
              className="-mt-1 -mr-1 shrink-0"
            />
          )}
        </header>
        {item.type !== "activity" && item.hiddenAt && <HiddenNotice />}
        {item.type === "activity" ? (
          <p className="line-clamp-2 text-sm">
            {verb}{" "}
            <Link
              href={mediaPath(item.media.type, item.media.sourceId)}
              className="focus-ring rounded-sm font-semibold hover:underline"
            >
              {item.media.title}
            </Link>
            {suffix && ` ${suffix}`}
          </p>
        ) : (
          <div
            className="rich-text line-clamp-2 max-h-10 overflow-hidden text-sm [&_blockquote]:my-0 [&_img]:hidden [&_ol]:my-0 [&_p]:my-0 [&_pre]:my-0 [&_ul]:my-0"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
          <Molecule.LikeButton
            liked={item.liked}
            count={item.likeCount}
            disabledReason={likeBlockedReason}
            onToggle={() =>
              toggleLike({ type: item.type, id: item.id }, item, (result) =>
                onChange({ ...item, ...result }),
              )
            }
          />
          <Molecule.CommentsButton count={item.commentCount} onClick={onOpen} />
          {item.type === "activity" && item.steam && (
            <Molecule.SteamBadge steam={item.steam} title={item.media.title} />
          )}
          {item.type === "post" && (
            <button
              type="button"
              onClick={onOpen}
              className="focus-ring rounded-sm text-xs text-muted hover:text-foreground"
            >
              Open post
            </button>
          )}
        </div>
      </div>
      {item.type === "activity" && (
        <Link
          href={mediaPath(item.media.type, item.media.sourceId)}
          aria-label={item.media.title}
          className="focus-ring relative h-12 w-8 shrink-0 overflow-hidden rounded border border-divider bg-rail-item"
        >
          {item.media.coverImage ? (
            <Image
              src={item.media.coverImage}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          ) : null}
        </Link>
      )}
    </article>
  );
}

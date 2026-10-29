"use client";

import { BookOpen, Gamepad2, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import * as Molecule from "@molecule";
import type { Activity, MediaType } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { activityText, mediaPath, progressText } from "@/lib/library";
import { timeAgo } from "@/lib/time";
import { toggleLike } from "@/lib/votes";

export const mediaTypes: Record<MediaType, { label: string; icon: ReactNode }> = {
  anime: { label: "Anime", icon: <Tv size={12} /> },
  manga: { label: "Manga", icon: <BookOpen size={12} /> },
  game: { label: "Game", icon: <Gamepad2 size={12} /> },
};

export function ActivityCard({
  activity,
  onOpenComments,
  onChange,
  preview = true,
}: {
  activity: Activity;
  onOpenComments?: () => void;
  onChange?: (activity: Activity) => void;
  preview?: boolean;
}) {
  const { author, media } = activity;
  const kind = mediaTypes[media.type];
  const [verb, suffix] = activity.progress
    ? progressText(activity.progress, media.type)
    : activityText(activity.status, media.type);
  const href = mediaPath(media.type, media.sourceId);

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-divider bg-surface p-4">
      <div className="flex items-start gap-4">
      <Molecule.AuthorAvatar author={author} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm">
          <Molecule.UserLink username={author.username} className="font-semibold">
            {displayName(author)}
          </Molecule.UserLink>{" "}
          {verb}{" "}
          <Link
            href={href}
            className="focus-ring rounded-sm font-semibold hover:underline"
          >
            {media.title}
          </Link>
          {suffix && ` ${suffix}`}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1 rounded-full bg-rail-item px-2 py-0.5 font-semibold text-foreground">
            {kind.icon}
            {kind.label}
          </span>
          {activity.steam && <Molecule.SteamBadge steam={activity.steam} title={media.title} />}
          <span className="flex items-center gap-2 whitespace-nowrap">
            {media.year && <span>{media.year}</span>}
            <span>·</span>
            <time
              dateTime={activity.createdAt}
              title={new Date(activity.createdAt).toLocaleString()}
            >
              {timeAgo(activity.createdAt)}
            </time>
          </span>
        </p>
      </div>
      <Link
        href={href}
        aria-label={media.title}
        className="focus-ring relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-md border border-divider bg-rail-item"
      >
        {media.coverImage && (
          <Image src={media.coverImage} alt="" fill unoptimized className="object-cover" />
        )}
      </Link>
      </div>
      <div className="flex items-center gap-4 pl-[52px]">
        <Molecule.LikeButton
          liked={activity.liked}
          count={activity.likeCount}
          onToggle={() =>
            toggleLike({ type: "activity", id: activity.id }, activity, (result) =>
              onChange?.({ ...activity, ...result }),
            )
          }
        />
        {onOpenComments && (
          <Molecule.CommentsButton count={activity.commentCount} onClick={onOpenComments} />
        )}
      </div>
      {preview && onOpenComments && (
        <Molecule.CommentPreview
          comments={activity.previewComments}
          total={activity.commentCount}
          onViewAll={onOpenComments}
        />
      )}
    </article>
  );
}

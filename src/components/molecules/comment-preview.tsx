import * as Atom from "@atom";
import type { PreviewComment } from "@/lib/api";
import { attachmentLabel } from "@/lib/links";
import { displayName } from "@/lib/display-name";
import { spoilerLabel } from "@/lib/spoiler";
import { timeAgo } from "@/lib/time";
import { HiddenGate } from "./hidden-gate";
import { UserLink } from "./user-link";

export function CommentPreview({
  comments,
  total,
  onViewAll,
}: {
  comments: PreviewComment[];
  total: number;
  onViewAll: () => void;
}) {
  if (comments.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-divider pt-3">
      <ul className="flex flex-col gap-3">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-2.5">
            <HiddenGate hiddenBecause={comment.hiddenBecause} className="min-w-0 flex-1">
              <Atom.Avatar
                size="xs"
                label={displayName(comment.author)}
                src={comment.author.avatarUrl}
                seed={comment.author.id}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg bg-background px-3 py-2">
                <p className="flex items-baseline gap-2 text-xs">
                  <UserLink username={comment.author.username} className="truncate font-semibold">
                    {displayName(comment.author)}
                  </UserLink>
                  <time
                    dateTime={comment.createdAt}
                    title={new Date(comment.createdAt).toLocaleString()}
                    className="shrink-0 text-muted"
                  >
                    {timeAgo(comment.createdAt)}
                  </time>
                </p>
                {comment.spoiler !== null ? (
                  <p className="text-[13px] text-muted italic">{spoilerLabel(comment.spoiler)}</p>
                ) : comment.content ? (
                  <div
                    className="rich-text line-clamp-3 text-[13px]"
                    dangerouslySetInnerHTML={{ __html: comment.content }}
                  />
                ) : null}
                {comment.linkUrl && comment.spoiler === null && (
                  <p className="text-[13px] text-muted italic">
                    {attachmentLabel(comment.linkUrl)}
                  </p>
                )}
              </div>
            </HiddenGate>
          </li>
        ))}
      </ul>
      {total > comments.length && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onViewAll();
          }}
          className="focus-ring w-fit cursor-pointer rounded-sm text-xs font-semibold text-muted hover:text-foreground"
        >
          View all {total} comments
        </button>
      )}
    </div>
  );
}

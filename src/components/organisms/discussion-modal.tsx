"use client";

import { Modal } from "antd";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import type { FeedEntry, Thread } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { timeAgo } from "@/lib/time";
import { castVote } from "@/lib/votes";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { ActivityCard } from "./activity-card";
import { CommentSection } from "./comment-section";
import { ContentActions } from "./content-actions";
import { PostCard } from "./post-card";
import { ThreadEditor, useThreadActions } from "./thread-card";


function ThreadDetail({
  thread,
  onChange,
  onDelete,
}: {
  thread: Thread;
  onChange: (thread: Thread) => void;
  onDelete?: (thread: Thread) => void;
}) {
  const [editing, setEditing] = useState(false);
  const { remove } = useThreadActions(thread, onDelete);

  if (editing) {
    return (
      <ThreadEditor
        thread={thread}
        onSaved={(updated) => onChange({ ...thread, ...updated })}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article className="flex gap-4">
      <Molecule.VoteControl
        symbols="thumbs"
        score={thread.score}
        myVote={thread.myVote}
        onVote={(value) =>
          castVote({ type: "thread", id: thread.id }, thread, value, (result) =>
            onChange({ ...thread, ...result }),
          )
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="flex items-center gap-2 text-xs text-muted">
          <Atom.Avatar
            size="xs"
            label={displayName(thread.author)}
            src={thread.author.avatarUrl}
            seed={thread.author.id}
          />
          <Molecule.UserLink username={thread.author.username}>
            {displayName(thread.author)}
          </Molecule.UserLink>
          · {timeAgo(thread.createdAt)} <Molecule.EditedMark editedAt={thread.editedAt} />
          <ContentActions
            type="thread"
            id={thread.id}
            ownerId={thread.author.id}
            canDelete={thread.canDelete}
            onEdit={() => setEditing(true)}
            onDelete={remove}
            className="-my-1 ml-auto"
          />
        </p>
        <h3 className="font-display text-3xl leading-[1.04] font-bold sm:text-4xl">
          {thread.title}
        </h3>
        {thread.content && (
          <div
            className="rich-text"
            dangerouslySetInnerHTML={{ __html: thread.content }}
          />
        )}
        {thread.linkUrl && <Molecule.LinkPreview url={thread.linkUrl} />}
      </div>
    </article>
  );
}

export function DiscussionModal({
  item,
  onClose,
  onChange,
  onDelete,
}: {
  item: FeedEntry | null;
  onClose: () => void;
  onChange: (item: FeedEntry) => void;
  onDelete?: (item: FeedEntry) => void;
}) {
  function deleted(entry: FeedEntry) {
    onDelete?.(entry);
    onClose();
  }

  const communityId = item && item.type !== "activity" ? item.communityId : null;
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const member = useCommunityStore(
    (state) =>
      communityId === null ||
      state.communities.some(({ id }) => id === communityId),
  );
  const canComment = signedIn && member;

  return (
    <Modal
      open={item !== null}
      onCancel={onClose}
      footer={null}
      width={840}
      destroyOnHidden
      title={null}
      classNames={{ container: "!p-5 sm:!p-8" }}
    >
      {item && (
        <div className="flex flex-col gap-6">
          <Molecule.ModalHeader
            eyebrow={
              item.type === "activity"
                ? `${displayName(item.author)} / Library`
                : item.community
                  ? `${item.community.name} / ${item.type === "thread" ? "Threads" : "Feed"}`
                  : `${item.type === "post" && item.wallUser ? displayName(item.wallUser) : "Profile"} / Wall`
            }
            title="The discussion"
          />
          {item.type === "thread" ? (
            <ThreadDetail thread={item} onChange={onChange} onDelete={deleted} />
          ) : item.type === "activity" ? (
            <ActivityCard activity={item} onChange={onChange} preview={false} />
          ) : (
            <PostCard
              post={item}
              showCommunity
              onChange={onChange}
              onDelete={deleted}
              preview={false}
            />
          )}
          <CommentSection
            key={`${item.type}-${item.id}`}
            target={{ type: item.type, id: item.id }}
            canComment={canComment}
            onCommentsChange={(comments) =>
              onChange({
                ...item,
                commentCount: comments.length,
                previewComments: comments
                  .filter((comment) => comment.parentId === null)
                  .slice(-3),
              })
            }
          />
        </div>
      )}
    </Modal>
  );
}

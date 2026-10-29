"use client";

import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
  type Comment,
  type Commentable,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { timeAgo } from "@/lib/time";
import { toggleLike } from "@/lib/votes";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { ContentActions } from "./content-actions";
import { PostComposer } from "./post-composer";

const MAX_INDENT = 5;

type CommentNode = Comment & { replies: CommentNode[] };

function buildTree(comments: Comment[]) {
  const nodes = new Map<number, CommentNode>(
    comments.map((comment) => [comment.id, { ...comment, replies: [] }]),
  );
  const roots: CommentNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.parentId === null ? null : nodes.get(node.parentId);
    (parent ? parent.replies : roots).push(node);
  }

  const sort = (list: CommentNode[]) => {
    list.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id - b.id,
    );
    list.forEach((node) => sort(node.replies));
  };
  sort(roots);
  return roots;
}

function CommentItem({
  node,
  depth,
  canReply,
  onReply,
  onChange,
  onDelete,
}: {
  node: CommentNode;
  depth: number;
  canReply: boolean;
  onReply: (content: string, parentId: number, linkUrl?: string) => Promise<void>;
  onChange: (comment: Comment) => void;
  onDelete: (comment: Comment) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const author = displayName(node.author);

  async function save(content: string, linkUrl?: string) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");
    onChange(await updateComment(token, node.id, content, linkUrl));
  }

  return (
    <li className="flex flex-col gap-3">
      {node.deleted ? (
        <p className="text-sm text-muted italic">Comment deleted</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <Atom.Avatar
              size="xs"
              label={author}
              src={node.author.avatarUrl}
              seed={node.author.id}
            />
            <Molecule.UserLink username={node.author.username} className="text-foreground">
              {author}
            </Molecule.UserLink>
            <time
              dateTime={node.createdAt}
              title={new Date(node.createdAt).toLocaleString()}
            >
              {timeAgo(node.createdAt)}
            </time>
            <Molecule.EditedMark editedAt={node.editedAt} />
          </p>
          {editing ? (
            <PostComposer
              autoFocus
              linkPreview
              initialContent={node.content}
              initialLink={node.linkUrl}
              submitLabel="Save"
              onPost={save}
              onPosted={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          ) : node.hidden ? (
            <p className="text-sm text-muted italic">
              {node.hidden === "reported"
                ? "You reported this comment."
                : "This comment is hidden while admins review it."}
            </p>
          ) : (
            <>
              {node.content && (
                <div
                  className="rich-text"
                  dangerouslySetInnerHTML={{ __html: node.content }}
                />
              )}
              {node.linkUrl && <Molecule.LinkPreview url={node.linkUrl} />}
            </>
          )}
          <div className="flex items-center gap-2">
            <Molecule.LikeButton
              liked={node.liked}
              count={node.likeCount}
              onToggle={() =>
                toggleLike({ type: "comment", id: node.id }, node, (result) =>
                  onChange({ ...node, ...result }),
                )
              }
            />
            {canReply && (
              <button
                type="button"
                onClick={() => setReplying((open) => !open)}
                aria-expanded={replying}
                className="focus-ring rounded-sm px-1 text-xs font-semibold text-muted transition-colors hover:text-foreground"
              >
                Reply
              </button>
            )}
            <ContentActions
              type="comment"
              id={node.id}
              ownerId={node.author.id}
              canDelete={node.canDelete}
              onEdit={() => setEditing(true)}
              onDelete={() => onDelete(node)}
              variant="text"
            />
          </div>
          {replying && (
            <PostComposer
              autoFocus
              linkPreview
              target={
                <p className="text-xs text-muted">
                  Replying to @{node.author.username}
                </p>
              }
              placeholder="Write a reply…"
              submitLabel="Reply"
              onPost={(content, linkUrl) => onReply(content, node.id, linkUrl)}
              onPosted={() => setReplying(false)}
              onCancel={() => setReplying(false)}
            />
          )}
        </div>
      )}
      {node.replies.length > 0 && (
        <ul
          className={`flex flex-col gap-6 ${
            depth < MAX_INDENT ? "border-l border-divider pl-5" : ""
          }`}
        >
          {node.replies.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              depth={depth + 1}
              canReply={canReply}
              onReply={onReply}
              onChange={onChange}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CommentSection({
  target,
  canComment = true,
  onCommentsChange,
}: {
  target: Commentable;
  canComment?: boolean;
  onCommentsChange: (comments: Comment[]) => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const { type, id } = target;

  useEffect(() => {
    const { token } = useAuthStore.getState();

    getComments(token, { type, id })
      .then((result) => {
        setFailed(false);
        setComments(result);
      })
      .catch(() => setFailed(true));
  }, [type, id, attempt]);

  async function handleReply(content: string, parentId?: number, linkUrl?: string) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    const comment = await createComment(token, { type, id }, content, parentId, linkUrl);
    useOnboardingStore.getState().refresh();
    const next = [...(comments ?? []), comment];
    setComments(next);
    onCommentsChange(next.filter((existing) => !existing.deleted));
  }

  async function handleDelete(comment: Comment) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    await deleteComment(token, comment.id);
    const next = await getComments(token, { type, id });
    setComments(next);
    onCommentsChange(next.filter((existing) => !existing.deleted));
  }

  const visible = comments?.filter((comment) => !comment.deleted);

  function handleChange(comment: Comment) {
    setComments((current) =>
      (current ?? []).map((existing) =>
        existing.id === comment.id ? { ...existing, ...comment } : existing,
      ),
    );
  }

  return (
    <section aria-label="Comments" className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl font-bold">
          {visible
            ? `${visible.length} ${visible.length === 1 ? "comment" : "comments"}`
            : "Comments"}
        </h3>
        <span className="text-xs text-muted">Oldest first</span>
      </div>
      {canComment ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold">Add a comment</p>
          <PostComposer
            linkPreview
            placeholder="Write a comment…"
            submitLabel="Comment"
            onPost={(content, linkUrl) => handleReply(content, undefined, linkUrl)}
          />
        </div>
      ) : signedIn ? (
        <p className="text-sm text-muted">Join this community to comment.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">Log in to join the conversation.</p>
          <Molecule.LoginLink>Log in</Molecule.LoginLink>
        </div>
      )}
      {failed && !comments ? (
        <Molecule.ConnectionError
          onRetry={() => {
            setFailed(false);
            setAttempt((count) => count + 1);
          }}
        />
      ) : !comments ? (
        <div className="flex py-8">
          <Atom.Loader />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          No comments yet.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-6">
            {buildTree(comments).map((node) => (
              <CommentItem
                key={node.id}
                node={node}
                depth={0}
                canReply={canComment}
                onReply={handleReply}
                onChange={handleChange}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

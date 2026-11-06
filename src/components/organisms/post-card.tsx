"use client";

import { ChevronRight, MessagesSquare, Pin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { deletePost, setPostPinned, updatePost, type Post } from "@/lib/api";
import { toggleBookmark, toggleLike } from "@/lib/votes";
import { displayName } from "@/lib/display-name";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { useFriendsStore } from "@/stores/friends-store";
import { ContentActions } from "./content-actions";
import { threadHref } from "./forum-shared";
import { useMemberModeration } from "./member-moderation";
import { PostComposer } from "./post-composer";
import { QuoteEmbed } from "./quote-embed";
import { HiddenNotice } from "./report-content";
import { RepostActions } from "./repost-actions";

export function useLikeBlockedReason(post: Post | null) {
  const myId = useAuthStore((state) => state.profile?.userId);
  const wallUser = post?.communityId === null ? post.wallUser : null;
  const communityId = post?.communityId ?? null;
  const notFriend = useFriendsStore(
    (state) =>
      state.loaded &&
      wallUser !== null &&
      !state.friends.some((friend) => friend.userId === wallUser.id),
  );
  const notMember = useCommunityStore(
    (state) =>
      state.loaded &&
      communityId !== null &&
      !state.communities.some((community) => community.id === communityId),
  );

  if (myId === undefined) return undefined;
  if (notMember) {
    return `Join ${post?.community?.name ?? "this community"} to like its posts.`;
  }
  if (notFriend && wallUser && wallUser.id !== myId) {
    return `Only ${displayName(wallUser)}’s friends can like posts on their wall.`;
  }
  return undefined;
}

type PostCardProps = {
  post: Post;
  showCommunity?: boolean;
  onOpenComments?: () => void;
  onChange?: (post: Post) => void;
  onDelete?: (post: Post) => void;
  onPinChange?: () => void;
  onAuthorRemoved?: (post: Post) => void;
  onAuthorBanned?: (post: Post) => void;
  preview?: boolean;
};

export function PostCard(props: PostCardProps) {
  return (
    <Molecule.HiddenGate hiddenBecause={props.post.hiddenBecause}>
      <VisiblePostCard {...props} />
    </Molecule.HiddenGate>
  );
}

function VisiblePostCard({
  post,
  showCommunity = false,
  onOpenComments,
  onChange,
  onDelete,
  onPinChange,
  onAuthorRemoved,
  onAuthorBanned,
  preview = true,
}: PostCardProps) {
  const wallUser =
    post.wallUser && post.wallUser.id !== post.author.id ? post.wallUser : null;
  const likeBlockedReason = useLikeBlockedReason(post);
  const [editing, setEditing] = useState(false);
  const thread =
    post.forumThread && post.communityId !== null
      ? { ...post.forumThread, href: threadHref(post.communityId, post.forumThread.id) }
      : null;
  const authorName = displayName(post.author);
  const moderation = useMemberModeration({
    onRemoved: () =>
      onAuthorRemoved
        ? onAuthorRemoved(post)
        : onChange?.({ ...post, moderation: post.moderation && { ...post.moderation, remove: false } }),
    onBanned: () => (onAuthorBanned ? onAuthorBanned(post) : onDelete?.(post)),
  });
  const target =
    post.communityId !== null && post.moderation
      ? { communityId: post.communityId, userId: post.author.id, name: authorName }
      : null;

  async function save(content: string, linkUrl?: string, spoiler?: string | null) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");
    const updated = await updatePost(token, post.id, content, linkUrl, spoiler);
    onChange?.({ ...post, ...updated });
  }

  async function remove() {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");
    await deletePost(token, post.id);
    onDelete?.(post);
  }

  async function togglePin() {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");
    await setPostPinned(token, post.id, !post.pinned);
    onChange?.({ ...post, pinned: !post.pinned });
    onPinChange?.();
  }

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-5">
      <Molecule.RepostedBy repostedBy={post.repostedBy} className="-mb-2" />
      {post.pinned && (
        <p className="-mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Pin size={13} aria-hidden />
          Pinned
        </p>
      )}
      <header className="flex items-center gap-3">
        <Molecule.AuthorAvatar
          author={post.author}
          community={(showCommunity && post.community) || undefined}
          wallUser={wallUser ?? undefined}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1 text-sm">
            <Molecule.UserLink username={post.author.username} className="min-w-0 truncate">
              {displayName(post.author)}
            </Molecule.UserLink>
            {wallUser && (
              <>
                <ChevronRight size={14} aria-label="on the wall of" className="shrink-0 text-muted" />
                <Molecule.UserLink username={wallUser.username} className="min-w-0 truncate">
                  {displayName(wallUser)}
                </Molecule.UserLink>
              </>
            )}
          </span>
          <span className="flex min-w-0 gap-1 text-xs text-muted">
            {showCommunity && post.community && (
              <span className="truncate">{post.community.name}</span>
            )}
            <span className="shrink-0">
              {showCommunity && post.community && "· "}
              <time
                dateTime={post.createdAt}
                title={new Date(post.createdAt).toLocaleString()}
              >
                {timeAgo(post.createdAt)}
              </time>{" "}
              <Molecule.EditedMark editedAt={post.editedAt} />
            </span>
          </span>
        </div>
        <ContentActions
          type="post"
          id={post.id}
          ownerId={post.author.id}
          canDelete={post.canDelete}
          onEdit={thread ? undefined : () => setEditing(true)}
          onDelete={remove}
          deleteNote={thread ? "It’s taken off the feed. The thread stays in the forum." : undefined}
          pin={post.canPin ? { pinned: Boolean(post.pinned), onToggle: togglePin } : undefined}
          bookmark={{
            bookmarked: post.bookmarked,
            onToggle: () =>
              toggleBookmark(post.id, post.bookmarked, (bookmarked) =>
                onChange?.({ ...post, bookmarked }),
              ),
          }}
          moderation={
            target
              ? {
                  name: authorName,
                  remove: post.moderation?.remove ? () => moderation.remove(target) : undefined,
                  ban: post.moderation?.ban ? () => moderation.ban(target) : undefined,
                }
              : undefined
          }
          className="-mr-1.5 self-start"
        />
        {moderation.dialog}
      </header>
      {post.hiddenAt && <HiddenNotice />}
      {editing ? (
        <PostComposer
          autoFocus
          linkPreview
          initialContent={post.content}
          initialLink={post.linkUrl}
          initialSpoiler={post.spoiler}
          submitLabel="Save"
          onPost={save}
          onPosted={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {thread && (
            <Link
              href={thread.href}
              className="focus-ring w-fit rounded-sm font-display text-xl leading-tight font-bold transition-colors hover:text-accent"
            >
              {thread.title}
            </Link>
          )}
          <Molecule.SpoilerGate spoiler={post.spoiler}>
            {post.content && (
              <div
                className={`rich-text ${thread ? "line-clamp-6" : ""}`}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            )}
            {post.linkUrl && <Molecule.LinkPreview url={post.linkUrl} />}
            {post.quote && <QuoteEmbed quote={post.quote} />}
          </Molecule.SpoilerGate>
        </>
      )}
      {thread ? (
        <div className="flex flex-wrap items-center gap-3">
          <Atom.ButtonLink
            href={thread.href}
            size="small"
            variant="secondary"
            icon={<MessagesSquare size={14} />}
          >
            Read the thread
          </Atom.ButtonLink>
          <span className="text-xs text-muted">
            {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
          </span>
          <RepostActions item={post} onChange={onChange} />
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Molecule.LikeButton
            liked={post.liked}
            count={post.likeCount}
            disabledReason={likeBlockedReason}
            onToggle={() =>
              toggleLike({ type: "post", id: post.id }, post, (result) =>
                onChange?.({ ...post, ...result }),
              )
            }
          />
          {onOpenComments && (
            <Molecule.CommentsButton count={post.commentCount} onClick={onOpenComments} />
          )}
          <RepostActions item={post} onChange={onChange} />
        </div>
      )}
      {preview && onOpenComments && !thread && (
        <Molecule.CommentPreview
          comments={post.previewComments}
          total={post.commentCount}
          onViewAll={onOpenComments}
        />
      )}
    </article>
  );
}

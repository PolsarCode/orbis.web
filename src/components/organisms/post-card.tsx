"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import * as Molecule from "@molecule";
import { deletePost, updatePost, type Post } from "@/lib/api";
import { toggleLike } from "@/lib/votes";
import { displayName } from "@/lib/display-name";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { useFriendsStore } from "@/stores/friends-store";
import { ContentActions } from "./content-actions";
import { PostComposer } from "./post-composer";
import { HiddenNotice } from "./report-content";

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
  preview?: boolean;
};

export function PostCard({
  post,
  showCommunity = false,
  onOpenComments,
  onChange,
  onDelete,
  preview = true,
}: PostCardProps) {
  const wallUser =
    post.wallUser && post.wallUser.id !== post.author.id ? post.wallUser : null;
  const likeBlockedReason = useLikeBlockedReason(post);
  const [editing, setEditing] = useState(false);

  async function save(content: string, linkUrl?: string) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");
    const updated = await updatePost(token, post.id, content, linkUrl);
    onChange?.({ ...post, ...updated });
  }

  async function remove() {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");
    await deletePost(token, post.id);
    onDelete?.(post);
  }

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-5">
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
          onEdit={() => setEditing(true)}
          onDelete={remove}
          className="-mr-1.5 self-start"
        />
      </header>
      {post.hiddenAt && <HiddenNotice />}
      {editing ? (
        <PostComposer
          autoFocus
          linkPreview
          initialContent={post.content}
          initialLink={post.linkUrl}
          submitLabel="Save"
          onPost={save}
          onPosted={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {post.content && (
            <div
              className="rich-text"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          )}
          {post.linkUrl && <Molecule.LinkPreview url={post.linkUrl} />}
        </>
      )}
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
      </div>
      {preview && onOpenComments && (
        <Molecule.CommentPreview
          comments={post.previewComments}
          total={post.commentCount}
          onViewAll={onOpenComments}
        />
      )}
    </article>
  );
}

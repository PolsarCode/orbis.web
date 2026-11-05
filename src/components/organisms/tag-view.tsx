"use client";

import { App } from "antd";
import { CloudOff, Hash, MessageCircle, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Template from "@template";
import {
  getCommunityPost,
  getMediaPost,
  getProfileActivity,
  getProfilePost,
  getTag,
  setTagFollowing,
  type Author,
  type FeedEntry,
  type Post,
  type TagItem,
  type TagPage,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { currentPath, loginUrl } from "@/lib/login";
import { pageTitle } from "@/lib/site-title";
import { tagPeople } from "@/lib/tags";
import { timeAgo } from "@/lib/time";
import { useDocumentTitle } from "@/lib/use-document-title";
import { useAuthStore } from "@/stores/auth-store";
import { DiscussionModal } from "./discussion-modal";
import { threadHref } from "./forum-shared";
import { FriendsPanel } from "./friends-panel";
import { HomeTabs } from "./home-tabs";
import { PostCard } from "./post-card";
import { SidePanel } from "./side-panel";
import { SearchScope } from "./site-search";

type TagComment = Extract<TagItem, { kind: "comment" }>;
type TagForumPost = Extract<TagItem, { kind: "forum_post" }>;

function tagItemKey(item: TagItem) {
  if (item.kind === "post") return `post-${item.post.id}`;
  if (item.kind === "comment") return `comment-${item.comment.id}`;
  return `forum_post-${item.forumPost.id}`;
}

function loadTarget({
  type,
  id,
  author,
  community,
  media,
  wallUser,
}: TagComment["target"]): Promise<FeedEntry> {
  const { token } = useAuthStore.getState();
  if (type === "activity") return getProfileActivity(token, author.username, id);
  if (community) return getCommunityPost(token, community.id, id);
  if (media) return getMediaPost(token, media.type, media.sourceId, id);
  return getProfilePost(token, (wallUser ?? author).username, id);
}

function commentContext({ type, author, community }: TagComment["target"]) {
  const owner = `${displayName(author)}’s ${type === "activity" ? "library update" : "post"}`;
  return community ? `Comment on ${owner} in ${community.name}` : `Comment on ${owner}`;
}

export function FollowTagButton({
  name,
  display,
  following,
  onChange,
  followingLabel = "Following",
  size = "middle",
}: {
  name: string;
  display: string;
  following: boolean;
  onChange: (following: boolean) => void;
  followingLabel?: string;
  size?: "small" | "middle";
}) {
  const { message } = App.useApp();
  const [pending, setPending] = useState(false);
  const label = following ? followingLabel : "Follow";

  async function toggle() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(true);
    try {
      const result = await setTagFollowing(token, name, !following);
      onChange(result.following);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.ReadOnlyGate action="follow tags">
      <Atom.Button
        size={size}
        variant={following ? "secondary" : "primary"}
        loading={pending}
        aria-label={`${label} #${display}`}
        onClick={toggle}
      >
        {label}
      </Atom.Button>
    </Molecule.ReadOnlyGate>
  );
}

function ItemHeader({
  author,
  createdAt,
  editedAt,
}: {
  author: Author;
  createdAt: string;
  editedAt?: string | null;
}) {
  return (
    <header className="flex items-center gap-3">
      <Molecule.AuthorAvatar author={author} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center text-sm">
          <Molecule.UserLink username={author.username} className="min-w-0 truncate">
            {displayName(author)}
          </Molecule.UserLink>
        </span>
        <span className="text-xs text-muted">
          <time dateTime={createdAt} title={new Date(createdAt).toLocaleString()}>
            {timeAgo(createdAt)}
          </time>{" "}
          <Molecule.EditedMark editedAt={editedAt} />
        </span>
      </div>
    </header>
  );
}

function CommentItem({
  item,
  opening,
  onOpen,
}: {
  item: TagComment;
  opening: boolean;
  onOpen: () => void;
}) {
  const { comment } = item;

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-5">
      <p className="-mb-2 flex min-w-0 items-center gap-1.5 text-xs text-muted">
        <MessageCircle size={13} aria-hidden className="shrink-0" />
        <span className="truncate">{commentContext(item.target)}</span>
      </p>
      <ItemHeader author={comment.author} createdAt={comment.createdAt} editedAt={comment.editedAt} />
      <Molecule.SpoilerGate spoiler={comment.spoiler}>
        {comment.content && (
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: comment.content }} />
        )}
        {comment.linkUrl && <Molecule.LinkPreview url={comment.linkUrl} />}
      </Molecule.SpoilerGate>
      <Atom.Button
        size="small"
        variant="secondary"
        icon={<MessagesSquare size={14} />}
        loading={opening}
        onClick={onOpen}
        className="self-start"
      >
        View the discussion
      </Atom.Button>
    </article>
  );
}

function ForumItem({ item }: { item: TagForumPost }) {
  const { forumPost, thread } = item;
  const href = forumPost.opening
    ? threadHref(thread.community.id, thread.id)
    : threadHref(thread.community.id, thread.id, forumPost.id);

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-5">
      <p className="-mb-2 flex min-w-0 items-center gap-1.5 text-xs text-muted">
        <MessagesSquare size={13} aria-hidden className="shrink-0" />
        <span className="truncate">
          {forumPost.opening ? "Forum thread" : "Forum reply"} in {thread.community.name}
        </span>
      </p>
      <ItemHeader author={forumPost.author} createdAt={forumPost.createdAt} editedAt={forumPost.editedAt} />
      <Link
        href={href}
        className="focus-ring w-fit rounded-sm font-display text-xl leading-tight font-bold transition-colors hover:text-accent"
      >
        {thread.title}
      </Link>
      <Molecule.SpoilerGate spoiler={forumPost.spoiler}>
        {forumPost.content && (
          <div
            className="rich-text line-clamp-6"
            dangerouslySetInnerHTML={{ __html: forumPost.content }}
          />
        )}
        {forumPost.linkUrl && <Molecule.LinkPreview url={forumPost.linkUrl} />}
      </Molecule.SpoilerGate>
      <Atom.ButtonLink
        href={href}
        size="small"
        variant="secondary"
        icon={<MessagesSquare size={14} />}
        className="self-start"
      >
        Read the thread
      </Atom.ButtonLink>
    </article>
  );
}

export function TagView({ name }: { name: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [page, setPage] = useState<TagPage | "invalid" | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [open, setOpen] = useState<FeedEntry | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const loaded = page && page !== "invalid" ? page : null;
  const title = `#${loaded?.tag.display ?? name}`;
  useDocumentTitle(pageTitle(title));

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) {
      router.replace(loginUrl(currentPath()));
      return;
    }

    let ignore = false;
    getTag(token, name)
      .then((result) => {
        if (ignore) return;
        setFailed(false);
        setPage(result ?? "invalid");
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [name, attempt, router]);

  function edit(change: (current: TagPage) => TagPage) {
    setPage((current) => (current && current !== "invalid" ? change(current) : current));
  }

  function loadMore() {
    const { token } = useAuthStore.getState();
    if (!token || !loaded?.nextCursor || loadingMore) return;

    setLoadingMore(true);
    setMoreFailed(false);
    getTag(token, name, loaded.nextCursor)
      .then((next) => {
        if (!next) throw new Error("Could not load this tag.");
        edit((current) => {
          const seen = new Set(current.items.map(tagItemKey));
          return {
            ...current,
            items: [...current.items, ...next.items.filter((item) => !seen.has(tagItemKey(item)))],
            nextCursor: next.nextCursor,
          };
        });
      })
      .catch(() => setMoreFailed(true))
      .finally(() => setLoadingMore(false));
  }

  function updatePost(post: Post) {
    edit((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.kind === "post" && item.post.id === post.id ? { ...item, post } : item,
      ),
    }));
  }

  function removePost(post: Post) {
    edit((current) => ({
      ...current,
      items: current.items.filter((item) => !(item.kind === "post" && item.post.id === post.id)),
    }));
  }

  function changeOpen(entry: FeedEntry) {
    setOpen(entry);
    if (entry.type === "post") updatePost(entry);
  }

  async function openDiscussion(item: TagComment) {
    setOpening(tagItemKey(item));
    try {
      setOpen(await loadTarget(item.target));
    } catch (e) {
      message.info(e instanceof Error ? e.message : "That post isn’t available.");
    } finally {
      setOpening(null);
    }
  }

  let content: ReactNode;
  if (failed && !page) {
    content = (
      <Molecule.FeedState
        role="alert"
        eyebrow="Connection error"
        icon={<CloudOff size={24} strokeWidth={1.5} />}
        title="This tag couldn’t be loaded."
        description="Check your connection and try again."
        action={<Atom.Button onClick={() => setAttempt((count) => count + 1)}>Try again</Atom.Button>}
      />
    );
  } else if (!page) {
    content = <Molecule.FeedSkeleton label="Loading posts…" />;
  } else if (page === "invalid") {
    content = (
      <Molecule.FeedState
        icon={<Hash size={24} strokeWidth={1.5} />}
        title="That’s not a hashtag."
        description="Hashtags are a # followed by letters, numbers, or underscores, like #frieren."
        action={<Atom.ButtonLink href="/?tab=trending">See trending tags</Atom.ButtonLink>}
      />
    );
  } else {
    const { tag, items, nextCursor } = page;
    content = (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4 [overflow-wrap:anywhere]">
          <div className="min-w-0">
            <Molecule.PageIntro
              eyebrow="Hashtag"
              title={`#${tag.display}`}
              description={tagPeople(tag.people, tag.window)}
            />
          </div>
          <FollowTagButton
            name={tag.name}
            display={tag.display}
            following={tag.following}
            onChange={(following) =>
              edit((current) => ({ ...current, tag: { ...current.tag, following } }))
            }
          />
        </div>
        {items.length === 0 ? (
          <Molecule.FeedState
            eyebrow="Empty"
            icon={<Hash size={24} strokeWidth={1.5} />}
            title="Nothing here yet."
            description={`Public posts, comments, and forum replies with #${tag.display} show up here.`}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) =>
              item.kind === "post" ? (
                <PostCard
                  key={tagItemKey(item)}
                  post={item.post}
                  showCommunity
                  onOpenComments={() => setOpen(item.post)}
                  onChange={updatePost}
                  onDelete={removePost}
                />
              ) : item.kind === "comment" ? (
                <CommentItem
                  key={tagItemKey(item)}
                  item={item}
                  opening={opening === tagItemKey(item)}
                  onOpen={() => openDiscussion(item)}
                />
              ) : (
                <ForumItem key={tagItemKey(item)} item={item} />
              ),
            )}
            {nextCursor ? (
              <Molecule.LoadMore onLoadMore={loadMore} loading={loadingMore} failed={moreFailed} />
            ) : (
              <Molecule.FeedEnd label="That’s everything with this tag" />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <SearchScope lead="tags" />
      <Template.PageHeader>
        <Atom.Heading>Home</Atom.Heading>
      </Template.PageHeader>
      <HomeTabs tab="trending" />
      <div className="flex min-h-0 flex-1">
        <Template.PageColumn>{content}</Template.PageColumn>
        <SidePanel label="Friends">
          <FriendsPanel />
        </SidePanel>
      </div>
      <DiscussionModal
        item={open}
        onClose={() => setOpen(null)}
        onChange={changeOpen}
        onDelete={(entry) => {
          if (entry.type === "post") removePost(entry);
        }}
      />
    </main>
  );
}

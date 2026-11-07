"use client";

import { App, Dropdown, Modal, Select, type MenuProps } from "antd";
import {
  ArrowRightLeft,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Quote,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  createForumPost,
  deleteForumPost,
  deleteForumThread,
  getForum,
  getForumThread,
  setForumThreadFlag,
  updateForumPost,
  updateForumThread,
  type ForumCategoryRef,
  type ForumIndex,
  type ForumPost,
  type ForumQuote,
  type ForumThread,
  type ForumThreadDetail,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { useReadOnly } from "@/lib/read-only";
import { pageTitle } from "@/lib/site-title";
import { timeAgo } from "@/lib/time";
import { useDocumentTitle } from "@/lib/use-document-title";
import { toggleLike } from "@/lib/votes";
import { requireToken, useAuthStore } from "@/stores/auth-store";
import { ContentActions } from "./content-actions";
import { useMemberModeration } from "./member-moderation";
import {
  ForumBreadcrumb,
  ForumLoadError,
  ForumPagination,
  categoryCrumbs,
  categoryHref,
  positiveParam,
  scrollColumnToTop,
  threadHref,
  useForum,
  useForumLoad,
} from "./forum-shared";
import { PostComposer } from "./post-composer";
import { HiddenNotice } from "./report-content";

const TITLE_MAX = 120;

function QuoteCard({ quote, href }: { quote: ForumQuote; href: string }) {
  if (!quote.available) {
    return (
      <p className="rounded-md border-l-2 border-divider bg-rail px-3 py-2 text-xs text-muted">
        The quoted post isn’t available.
      </p>
    );
  }

  return (
    <Molecule.HiddenGate hiddenBecause={quote.hiddenBecause}>
      <figure className="flex flex-col gap-1.5 rounded-md border-l-2 border-accent bg-rail px-3 py-2">
        <figcaption className="text-xs text-muted">
          <Link href={href} className="focus-ring rounded-sm font-semibold text-foreground transition-colors hover:text-accent">
            {displayName(quote.author)}
          </Link>{" "}
          wrote:
        </figcaption>
        <Molecule.SpoilerGate spoiler={quote.spoiler}>
          {quote.content ? (
            <blockquote
              className="rich-text line-clamp-4 text-[13px]"
              dangerouslySetInnerHTML={{ __html: quote.content }}
            />
          ) : (
            quote.linkUrl && <p className="truncate text-[13px] text-muted">{quote.linkUrl}</p>
          )}
        </Molecule.SpoilerGate>
      </figure>
    </Molecule.HiddenGate>
  );
}

type ForumPostCardProps = {
  post: ForumPost;
  number: number;
  thread: ForumThread;
  communityId: number;
  highlighted: boolean;
  likeBlockedReason?: string;
  onChange: (post: ForumPost) => void;
  onDeleted: (post: ForumPost) => void;
  onAuthorRemoved: (post: ForumPost) => void;
  onAuthorBanned: (post: ForumPost) => void;
  onQuote: (post: ForumPost) => void;
};

function ForumPostCard(props: ForumPostCardProps) {
  return (
    <div id={`post-${props.post.id}`} className="scroll-mt-4">
      <Molecule.HiddenGate hiddenBecause={props.post.hiddenBecause}>
        <VisibleForumPostCard {...props} />
      </Molecule.HiddenGate>
    </div>
  );
}

function VisibleForumPostCard({
  post,
  number,
  thread,
  communityId,
  highlighted,
  likeBlockedReason,
  onChange,
  onDeleted,
  onAuthorRemoved,
  onAuthorBanned,
  onQuote,
}: ForumPostCardProps) {
  const [editing, setEditing] = useState(false);
  const permalink = threadHref(communityId, thread.id, post.id);
  const authorName = displayName(post.author);
  const moderation = useMemberModeration({
    onRemoved: () => onAuthorRemoved(post),
    onBanned: () => onAuthorBanned(post),
  });
  const target = { communityId, userId: post.author.id, name: authorName };

  async function save(content: string, linkUrl?: string, spoiler?: string | null) {
    onChange(
      await updateForumPost(requireToken(), communityId, post.id, content, linkUrl, spoiler),
    );
  }

  async function remove() {
    await deleteForumPost(requireToken(), communityId, post.id);
    onDeleted(post);
  }

  return (
    <article
      aria-label={`Post ${number} by ${displayName(post.author)}`}
      className={`flex flex-col gap-4 rounded-lg border bg-surface p-5 ${
        highlighted ? "border-accent" : "border-divider"
      }`}
    >
      <header className="flex items-center gap-3">
        <Molecule.AuthorAvatar author={post.author} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1.5 text-sm">
            <Molecule.UserLink username={post.author.username} className="min-w-0 truncate">
              {displayName(post.author)}
            </Molecule.UserLink>
            {!post.opening && post.author.id === thread.author.id && (
              <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-bold text-accent uppercase">
                Author
              </span>
            )}
          </span>
          <span className="flex gap-1 text-xs text-muted">
            <time dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString()}>
              {timeAgo(post.createdAt)}
            </time>
            <Molecule.EditedMark
              editedAt={post.editedAt}
              target={{ type: "forumPost", id: post.id, communityId, createdAt: post.createdAt }}
            />
          </span>
        </div>
        <Link
          href={permalink}
          aria-label={`Link to post ${number}`}
          className="focus-ring self-start rounded-sm text-xs text-muted tabular-nums transition-colors hover:text-foreground"
        >
          #{number}
        </Link>
        <ContentActions
          type="forum_post"
          id={post.id}
          ownerId={post.author.id}
          canDelete={post.canDelete}
          onEdit={post.canEdit ? () => setEditing(true) : undefined}
          onDelete={remove}
          deleteNote={
            post.opening
              ? "The whole thread and its replies are deleted with it. This can’t be undone."
              : undefined
          }
          moderation={
            post.moderation
              ? {
                  name: authorName,
                  remove: post.moderation.remove ? () => moderation.remove(target) : undefined,
                  ban: post.moderation.ban ? () => moderation.ban(target) : undefined,
                }
              : undefined
          }
          className="-mr-1.5 self-start"
        />
        {moderation.dialog}
      </header>
      {post.hiddenAt && <HiddenNotice />}
      {post.quote && (
        <QuoteCard quote={post.quote} href={threadHref(communityId, thread.id, post.quote.id)} />
      )}
      {editing ? (
        <PostComposer
          autoFocus
          linkPreview
          label="Edit your post"
          initialContent={post.content}
          initialLink={post.linkUrl}
          initialSpoiler={post.spoiler}
          submitLabel="Save"
          onPost={save}
          onPosted={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Molecule.ContentBody content={post.content} linkUrl={post.linkUrl} spoiler={post.spoiler} />
      )}
      <div className="flex items-center gap-4">
        <Molecule.LikeButton
          liked={post.liked}
          count={post.likeCount}
          disabledReason={likeBlockedReason}
          onToggle={() =>
            toggleLike({ type: "forum_post", id: post.id }, post, (result) =>
              onChange({ ...post, ...result }),
            )
          }
        />
        {thread.canReply && (
          <Molecule.ReadOnlyGate action="reply">
            <button
              type="button"
              onClick={() => onQuote(post)}
              className="focus-ring inline-flex items-center gap-1.5 rounded-sm text-xs text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Quote size={14} aria-hidden />
              Quote
            </button>
          </Molecule.ReadOnlyGate>
        )}
      </div>
    </article>
  );
}

function MoveThread({
  communityId,
  thread,
  open,
  onClose,
  onMoved,
}: {
  communityId: number;
  thread: ForumThread;
  open: boolean;
  onClose: () => void;
  onMoved: (category: ForumCategoryRef) => void;
}) {
  const [forum, setForum] = useState<ForumIndex | null>(null);
  const [target, setTarget] = useState<number>(thread.category.id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    getForum(useAuthStore.getState().token, communityId)
      .then((result) => {
        if (!ignore) setForum(result);
      })
      .catch((reason: Error) => {
        if (!ignore) setError(reason.message);
      });
    return () => {
      ignore = true;
    };
  }, [open, communityId]);

  const sectionOf = (sectionId: number | null) =>
    forum?.sections.find(({ id }) => id === sectionId) ?? null;
  const optionsFor = (sectionId: number | null) =>
    (forum?.categories ?? [])
      .filter((category) => category.sectionId === sectionId)
      .map(({ id, name }) => ({ value: id, label: name }));
  const options = forum
    ? [
        ...optionsFor(null),
        ...forum.sections
          .map((section) => ({ label: section.name, options: optionsFor(section.id) }))
          .filter((group) => group.options.length > 0),
      ]
    : [];

  async function move() {
    const category = forum?.categories.find(({ id }) => id === target);
    if (!category || category.id === thread.category.id) return onClose();
    setPending(true);
    setError(null);
    try {
      await updateForumThread(requireToken(), communityId, thread.id, { categoryId: category.id });
      onMoved({ id: category.id, name: category.name, section: sectionOf(category.sectionId) });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Move thread"
      okText="Move"
      okButtonProps={{ loading: pending, disabled: !forum }}
      onOk={move}
      onCancel={onClose}
      destroyOnHidden
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Choose the category this thread belongs in.</p>
        <Select
          aria-label="Category"
          loading={!forum && !error}
          value={target}
          onChange={setTarget}
          options={options}
        />
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      </div>
    </Modal>
  );
}

function ThreadMenu({
  communityId,
  thread,
  onRename,
  onChange,
}: {
  communityId: number;
  thread: ForumThread;
  onRename: () => void;
  onChange: (thread: ForumThread) => void;
}) {
  const router = useRouter();
  const readOnly = useReadOnly();
  const { modal, message } = App.useApp();
  const [moving, setMoving] = useState(false);

  async function setFlag(flag: "pin" | "lock", on: boolean) {
    try {
      await setForumThreadFlag(requireToken(), communityId, thread.id, flag, on);
      onChange(flag === "pin" ? { ...thread, pinned: on } : { ...thread, locked: on });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  function confirmDelete() {
    modal.confirm({
      title: "Delete this thread?",
      content: "All of its replies are deleted with it. This can’t be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () =>
        deleteForumThread(requireToken(), communityId, thread.id)
          .then(() => router.push(categoryHref(communityId, thread.category.id)))
          .catch((error: Error) => {
            message.error(error.message);
          }),
    });
  }

  const items: MenuProps["items"] = [
    ...(thread.canEdit
      ? [{ key: "rename", label: "Rename", icon: <Pencil size={14} />, disabled: readOnly }]
      : []),
    ...(thread.canModerate
      ? [
          {
            key: "pin",
            label: thread.pinned ? "Unpin" : "Pin to the top",
            icon: thread.pinned ? <PinOff size={14} /> : <Pin size={14} />,
            disabled: readOnly,
          },
          {
            key: "lock",
            label: thread.locked ? "Unlock replies" : "Lock replies",
            icon: thread.locked ? <LockOpen size={14} /> : <Lock size={14} />,
            disabled: readOnly,
          },
          {
            key: "move",
            label: "Move to another category",
            icon: <ArrowRightLeft size={14} />,
            disabled: readOnly,
          },
        ]
      : []),
    ...(thread.canEdit
      ? [
          { type: "divider" as const },
          {
            key: "delete",
            label: "Delete thread",
            icon: <Trash2 size={14} />,
            danger: true,
            disabled: readOnly,
          },
        ]
      : []),
  ];

  if (!thread.canEdit && !thread.canModerate) return null;

  return (
    <>
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items,
          onClick: ({ key }) => {
            if (key === "rename") onRename();
            else if (key === "pin") void setFlag("pin", !thread.pinned);
            else if (key === "lock") void setFlag("lock", !thread.locked);
            else if (key === "move") setMoving(true);
            else confirmDelete();
          },
        }}
      >
        <button type="button" aria-label="Thread options" className="icon-button shrink-0 cursor-pointer">
          <MoreHorizontal size={20} />
        </button>
      </Dropdown>
      <MoveThread
        communityId={communityId}
        thread={thread}
        open={moving}
        onClose={() => setMoving(false)}
        onMoved={(category) =>
          onChange({ ...thread, categoryId: category.id, category })
        }
      />
    </>
  );
}

function RenameThread({
  communityId,
  thread,
  onDone,
}: {
  communityId: number;
  thread: ForumThread;
  onDone: (title?: string) => void;
}) {
  const [title, setTitle] = useState(thread.title);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("Give your thread a title.");
    setPending(true);
    setError(null);
    try {
      const updated = await updateForumThread(requireToken(), communityId, thread.id, { title });
      onDone(updated.title);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <Atom.Input
        autoFocus
        size="large"
        value={title}
        maxLength={TITLE_MAX}
        aria-label="Thread title"
        onChange={(event) => setTitle(event.target.value)}
      />
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <div className="flex gap-2">
        <Atom.Button type="submit" size="small" loading={pending}>
          Save
        </Atom.Button>
        <Atom.Button size="small" variant="secondary" onClick={() => onDone()}>
          Cancel
        </Atom.Button>
      </div>
    </form>
  );
}

export function ForumThreadView() {
  const { community, joinPrompt } = useForum();
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const threadId = Number(params.threadId);
  const search = useSearchParams();
  const page = positiveParam(search.get("page"));
  const target = positiveParam(search.get("post"));
  const { loaded, setLoaded, data, ready, retry } = useForumLoad(
    `${community.id}:${threadId}:${page ?? ""}:${target ?? ""}`,
    () => getForumThread(useAuthStore.getState().token, community.id, threadId, { page, post: target }),
  );
  const [quoting, setQuoting] = useState<ForumPost | null>(null);
  const [renaming, setRenaming] = useState(false);
  const root = useRef<HTMLElement>(null);
  const composer = useRef<HTMLDivElement>(null);
  const signedIn = useAuthStore((state) => Boolean(state.token));
  useDocumentTitle(pageTitle(data?.thread.title, community.name, data ? null : "Forum"));

  useEffect(() => {
    if (!ready) return;
    const post = target === undefined ? null : document.getElementById(`post-${target}`);
    if (post) post.scrollIntoView({ block: "center" });
    else scrollColumnToTop(root.current);
  }, [ready, target]);

  if (!loaded || !ready) {
    return <Molecule.FeedSkeleton label="Loading the thread" />;
  }
  if (!data) {
    return (
      <ForumLoadError
        communityId={community.id}
        title="Couldn’t open this thread."
        error={loaded.error}
        onRetry={retry}
      />
    );
  }

  const { thread } = data;
  const likeBlockedReason =
    signedIn && !community.role ? `Join ${community.name} to like its posts.` : undefined;

  function patch(next: Partial<ForumThreadDetail>) {
    setLoaded((current) =>
      current?.data ? { ...current, data: { ...current.data, ...next } } : current,
    );
  }

  function replacePost(post: ForumPost) {
    if (!data) return;
    patch({ items: data.items.map((item) => (item.id === post.id ? { ...item, ...post } : item)) });
  }

  function removePost(post: ForumPost) {
    if (!data) return;
    if (post.opening) {
      router.push(categoryHref(community.id, thread.category.id));
      return;
    }
    patch({
      items: data.items.filter(({ id }) => id !== post.id),
      total: data.total - 1,
      thread: { ...thread, replyCount: thread.replyCount - 1 },
    });
  }

  function authorRemoved(post: ForumPost) {
    if (!data) return;
    patch({
      items: data.items.map((item) =>
        item.author.id === post.author.id && item.moderation
          ? { ...item, moderation: { ...item.moderation, remove: false } }
          : item,
      ),
    });
  }

  function authorBanned(post: ForumPost) {
    if (post.author.id === thread.author.id) {
      router.push(categoryHref(community.id, thread.category.id));
      return;
    }
    if (quoting?.author.id === post.author.id) setQuoting(null);
    retry();
  }

  function quote(post: ForumPost) {
    setQuoting(post);
    composer.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  async function reply(content: string, linkUrl?: string, spoiler?: string | null) {
    const { id } = await createForumPost(
      requireToken(),
      community.id,
      thread.id,
      content,
      quoting?.id,
      linkUrl,
      spoiler,
    );
    setQuoting(null);
    router.push(threadHref(community.id, thread.id, id));
  }

  return (
    <section ref={root} aria-labelledby="forum-thread-heading" className="flex scroll-mt-4 flex-col gap-4">
      <header className="flex flex-col gap-2 rounded-lg border border-divider bg-surface p-4 sm:p-5">
        <ForumBreadcrumb items={categoryCrumbs(community.id, thread.category, true)} />
        {renaming ? (
          <RenameThread
            communityId={community.id}
            thread={thread}
            onDone={(title) => {
              if (title) patch({ thread: { ...thread, title } });
              setRenaming(false);
            }}
          />
        ) : (
          <div className="flex items-start gap-3">
            <h2
              id="forum-thread-heading"
              className="min-w-0 flex-1 font-display text-2xl leading-tight font-bold break-words sm:text-3xl"
            >
              {thread.title}
            </h2>
            <ThreadMenu
              communityId={community.id}
              thread={thread}
              onRename={() => setRenaming(true)}
              onChange={(next) => patch({ thread: next })}
            />
          </div>
        )}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {thread.pinned && (
            <span className="flex items-center gap-1 font-semibold text-accent">
              <Pin size={13} aria-hidden />
              Pinned
            </span>
          )}
          {thread.locked && (
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Lock size={13} aria-hidden />
              Locked
            </span>
          )}
          <span>
            {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
          </span>
        </p>
      </header>
      <ForumPagination page={data.page} pageSize={data.pageSize} total={data.total} />
      <ol aria-label="Posts" className="flex flex-col gap-3">
        {data.items.map((post, index) => (
          <li key={post.id}>
            <ForumPostCard
              post={post}
              number={(data.page - 1) * data.pageSize + index + 1}
              thread={thread}
              communityId={community.id}
              highlighted={post.id === target}
              likeBlockedReason={likeBlockedReason}
              onChange={replacePost}
              onDeleted={removePost}
              onAuthorRemoved={authorRemoved}
              onAuthorBanned={authorBanned}
              onQuote={quote}
            />
          </li>
        ))}
      </ol>
      <ForumPagination page={data.page} pageSize={data.pageSize} total={data.total} />
      <div ref={composer} className="scroll-mt-4">
        {thread.canReply ? (
          <PostComposer
            linkPreview
            label="Write a reply"
            placeholder="Write a reply…"
            submitLabel="Reply"
            target={
              quoting && (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Quote size={14} aria-hidden className="shrink-0 text-accent" />
                  <span className="min-w-0 truncate">
                    Quoting{" "}
                    <span className="font-semibold text-foreground">{displayName(quoting.author)}</span>
                  </span>
                  <button
                    type="button"
                    aria-label="Stop quoting"
                    onClick={() => setQuoting(null)}
                    className="icon-button ml-auto h-6 w-6 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </p>
              )
            }
            onPost={reply}
          />
        ) : thread.locked && community.role ? (
          <p className="flex items-center gap-2 rounded-lg border border-dashed border-divider bg-surface p-4 text-[13px] text-muted">
            <Lock size={16} aria-hidden className="shrink-0" />
            This thread is locked, so only admins can reply.
          </p>
        ) : (
          joinPrompt
        )}
      </div>
    </section>
  );
}

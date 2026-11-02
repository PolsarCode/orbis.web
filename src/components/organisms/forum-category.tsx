"use client";

import { Lock, MessageSquare, MessagesSquare, Pin, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  createForumThread,
  getForumThreads,
  type ForumThreadPage,
  type ForumThreadSummary,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { pageTitle } from "@/lib/site-title";
import { timeAgo } from "@/lib/time";
import { useDocumentTitle } from "@/lib/use-document-title";
import { useAuthStore } from "@/stores/auth-store";
import {
  AdminOnlyMark,
  FeedMark,
  ForumBreadcrumb,
  ForumEmpty,
  categoryCrumbs,
  ForumPagination,
  forumHref,
  forumToken,
  positiveParam,
  scrollColumnToTop,
  threadHref,
  useForum,
} from "./forum-shared";
import { PostComposer } from "./post-composer";

const TITLE_MAX = 120;

function ThreadRow({ thread, communityId }: { thread: ForumThreadSummary; communityId: number }) {
  return (
    <li className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-rail-item/40 sm:gap-4">
      <Atom.Avatar
        label={displayName(thread.author)}
        src={thread.author.avatarUrl}
        seed={thread.author.id}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          {thread.pinned && <Pin size={13} aria-label="Pinned" className="shrink-0 text-accent" />}
          {thread.locked && <Lock size={13} aria-label="Locked" className="shrink-0 text-muted" />}
          <Link
            href={threadHref(communityId, thread.id)}
            className="focus-ring truncate rounded-sm text-sm font-semibold transition-colors after:absolute after:inset-0 hover:text-accent"
          >
            {thread.title}
          </Link>
        </span>
        <span className="truncate text-xs text-muted">
          {displayName(thread.author)} ·{" "}
          <time dateTime={thread.createdAt} title={new Date(thread.createdAt).toLocaleString()}>
            {timeAgo(thread.createdAt)}
          </time>
        </span>
      </span>
      <span
        className="flex shrink-0 items-center gap-1 text-xs text-muted tabular-nums"
        aria-label={`${thread.replyCount} ${thread.replyCount === 1 ? "reply" : "replies"}`}
      >
        <MessageSquare size={13} aria-hidden />
        {thread.replyCount}
      </span>
      <span className="hidden w-36 shrink-0 flex-col items-end text-right text-xs text-muted sm:flex">
        {thread.lastReply ? (
          <>
            <span className="max-w-full truncate font-semibold text-foreground">
              {displayName(thread.lastReply.author)}
            </span>
            <time dateTime={thread.lastReply.createdAt}>{timeAgo(thread.lastReply.createdAt)}</time>
          </>
        ) : (
          <span>No replies yet</span>
        )}
      </span>
    </li>
  );
}

function NewThread({
  communityId,
  categoryId,
  onCancel,
}: {
  communityId: number;
  categoryId: number;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");

  return (
    <PostComposer
      linkPreview
      label="Thread body"
      placeholder="What do you want to talk about?"
      submitLabel="Post thread"
      target={
        <input
          autoFocus
          value={title}
          maxLength={TITLE_MAX}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Thread title"
          aria-label="Thread title"
          className="w-full border-b border-divider bg-transparent pb-3 font-display text-xl font-bold outline-none placeholder:text-muted"
        />
      }
      onPost={async (content, linkUrl) => {
        if (!title.trim()) throw new Error("Give your thread a title.");
        const { id } = await createForumThread(forumToken(), communityId, categoryId, {
          title,
          content,
          linkUrl,
        });
        router.push(threadHref(communityId, id));
      }}
      onCancel={onCancel}
    />
  );
}

export function ForumCategoryView() {
  const { community, joinPrompt } = useForum();
  const params = useParams<{ categoryId: string }>();
  const categoryId = Number(params.categoryId);
  const page = positiveParam(useSearchParams().get("page")) ?? 1;
  const key = `${categoryId}:${page}`;
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{
    key: string;
    attempt: number;
    data: ForumThreadPage | null;
    error?: string;
  } | null>(null);
  const [composing, setComposing] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const data = loaded?.key === key ? loaded.data : null;
  useDocumentTitle(pageTitle(data?.category.name, community.name, data ? null : "Forum"));

  useEffect(() => {
    let ignore = false;
    getForumThreads(useAuthStore.getState().token, community.id, categoryId, page)
      .then((result) => {
        if (!ignore) setLoaded({ key, attempt, data: result });
      })
      .catch((error: Error) => {
        if (!ignore) setLoaded({ key, attempt, data: null, error: error.message });
      });
    return () => {
      ignore = true;
    };
  }, [community.id, categoryId, page, key, attempt]);

  const ready = loaded?.key === key && loaded.attempt === attempt;
  useEffect(() => {
    if (ready) scrollColumnToTop(root.current);
  }, [ready]);


  if (!loaded || !ready) {
    return <Molecule.FeedSkeleton label="Loading threads" />;
  }
  if (!data) {
    return (
      <Molecule.FeedState
        eyebrow="Forum"
        icon={<MessagesSquare size={24} strokeWidth={1.5} />}
        title="Couldn’t open this category."
        description={loaded.error ?? "Please try again."}
        action={
          <div className="flex flex-wrap gap-2">
            <Atom.Button variant="secondary" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Atom.Button>
            <Atom.ButtonLink href={forumHref(community.id)} variant="text">
              Back to the forum
            </Atom.ButtonLink>
          </div>
        }
        role="alert"
      />
    );
  }

  const threads = [...data.pinned, ...data.items];

  return (
    <div ref={root} className="flex scroll-mt-4 flex-col gap-4">
      <header className="flex flex-col gap-2 rounded-lg border border-divider bg-surface p-4 sm:p-5">
        <ForumBreadcrumb items={categoryCrumbs(community.id, data.category, false)} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl leading-tight font-bold sm:text-3xl">
                {data.category.name}
              </h2>
              {data.category.adminOnly && <AdminOnlyMark size={18} />}
              {data.category.postToFeed && <FeedMark size={18} />}
            </div>
            {data.category.description && (
              <p className="max-w-xl text-[13px] text-muted">{data.category.description}</p>
            )}
          </div>
          {data.canPost && !composing && (
            <Molecule.ReadOnlyGate action="start threads">
              <Atom.Button icon={<Plus size={16} />} onClick={() => setComposing(true)}>
                New thread
              </Atom.Button>
            </Molecule.ReadOnlyGate>
          )}
        </div>
      </header>
      {!data.canPost && joinPrompt}
      {composing && (
        <NewThread
          communityId={community.id}
          categoryId={categoryId}
          onCancel={() => setComposing(false)}
        />
      )}
      {threads.length === 0 ? (
        <ForumEmpty
          title={page > 1 ? "Nothing on this page." : "No threads yet."}
          description={
            page > 1
              ? "Go back to an earlier page to see threads."
              : data.canPost
                ? "Start the first one and get the conversation going."
                : "Threads people start here will show up in this list."
          }
        />
      ) : (
        <ul
          aria-label={`Threads in ${data.category.name}`}
          className="flex flex-col divide-y divide-divider overflow-hidden rounded-lg border border-divider bg-surface"
        >
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} communityId={community.id} />
          ))}
        </ul>
      )}
      <ForumPagination page={data.page} pageSize={data.pageSize} total={data.total} />
    </div>
  );
}

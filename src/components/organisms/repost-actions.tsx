"use client";

import { App, Dropdown, Modal, Segmented, Tooltip, type MenuProps } from "antd";
import { MessageSquareQuote, Repeat, Undo2 } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  createPost,
  createWallPost,
  getQuotes,
  getReposters,
  repost,
  undoRepost,
  type FeedEntry,
  type Page,
  type Post,
  type QuotedItem,
  type QuotedPost,
  type RepostedBy,
  type RepostResult,
  type ShareTarget,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { currentPath, loginUrl } from "@/lib/login";
import { useReadOnly } from "@/lib/read-only";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { DestinationPicker, type Destination } from "./destination-picker";
import { DiscussionModal } from "./discussion-modal";
import { PostCard } from "./post-card";
import { PostComposer } from "./post-composer";
import { QuoteEmbed } from "./quote-embed";

export const QuotedContext = createContext<((post: Post) => void) | null>(null);

export const MediaPageContext = createContext<QuotedPost["media"]>(null);

type Dialog = "repost" | "quote" | "list";

const nouns: Record<FeedEntry["type"], string> = { post: "post", activity: "library update" };

function quotedItem(item: FeedEntry, page: QuotedPost["media"]): QuotedItem {
  if (item.type === "activity") return { available: true, type: "activity", activity: item };
  const { mediaType: type, mediaSourceId: sourceId } = item;
  const title = page && page.type === type && page.sourceId === sourceId ? page.title : null;
  return {
    available: true,
    type: "post",
    post: { ...item, media: type && sourceId ? { type, sourceId, title } : null },
  };
}

function withoutViewer(repostedBy: RepostedBy | null | undefined, viewerId: number | undefined) {
  if (!repostedBy?.people.some(({ id }) => id === viewerId)) return repostedBy;
  const total = repostedBy.total - 1;
  return total > 0
    ? { people: repostedBy.people.filter(({ id }) => id !== viewerId), total }
    : null;
}

function requireLogin() {
  window.location.assign(loginUrl(currentPath()));
}

export function RepostActions<T extends FeedEntry>({
  item,
  onChange,
}: {
  item: T;
  onChange?: (item: T) => void;
}) {
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const readOnly = useReadOnly();
  const { message } = App.useApp();
  const onQuoted = useContext(QuotedContext);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const canShare = item.canRepost || item.reposted || item.canQuote;

  if (signedIn && !canShare && item.repostCount === 0) return null;

  async function undo() {
    const { token, profile } = useAuthStore.getState();
    if (!token) return requireLogin();
    try {
      onChange?.({
        ...item,
        ...(await undoRepost(token, item)),
        repostedBy: withoutViewer(item.repostedBy, profile?.userId),
      });
      message.success("Repost removed.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  function reposted(result: RepostResult) {
    setDialog(null);
    onChange?.({ ...item, ...result });
    message.success("Reposted.");
  }

  function quoted(post: Post) {
    onChange?.({ ...item, repostCount: item.repostCount + 1 });
    onQuoted?.(post);
    useOnboardingStore.getState().refresh();
    message.success("Quote posted.");
  }

  const items: MenuProps["items"] = [
    ...(item.reposted
      ? [{ key: "undo", label: "Undo repost", icon: <Undo2 size={14} /> }]
      : item.canRepost
        ? [{ key: "repost", label: "Repost", icon: <Repeat size={14} /> }]
        : []),
    ...(item.canQuote
      ? [{ key: "quote", label: "Quote", icon: <MessageSquareQuote size={14} /> }]
      : []),
  ];
  const disabledReason = signedIn && !canShare ? "You can’t repost or quote this." : undefined;
  const tone = item.reposted ? "font-semibold text-accent" : "text-muted hover:text-foreground";
  const iconButton = (
    <button
      type="button"
      aria-label={
        item.reposted ? (item.canQuote ? "Undo repost or quote" : "Undo repost") : "Repost or quote"
      }
      aria-disabled={disabledReason ? true : undefined}
      onClick={signedIn ? undefined : requireLogin}
      className={`focus-ring inline-flex rounded-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        disabledReason ? "cursor-not-allowed text-muted opacity-60" : `cursor-pointer ${tone}`
      }`}
    >
      <Repeat size={14} />
    </button>
  );

  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 text-xs"
      onClick={(event) => event.stopPropagation()}
    >
      {!signedIn ? (
        iconButton
      ) : disabledReason ? (
        <Tooltip title={disabledReason} classNames={{ root: "touch-visible" }}>
          {iconButton}
        </Tooltip>
      ) : readOnly ? (
        <Molecule.ReadOnlyGate action="repost or quote">{iconButton}</Molecule.ReadOnlyGate>
      ) : (
        <Dropdown
          trigger={["click"]}
          placement="bottomLeft"
          menu={{
            items,
            onClick: ({ key }) => (key === "undo" ? undo() : setDialog(key as Dialog)),
          }}
        >
          {iconButton}
        </Dropdown>
      )}
      <button
        type="button"
        onClick={() => (signedIn ? setDialog("list") : requireLogin())}
        className={`focus-ring inline-flex w-fit cursor-pointer rounded-sm transition-colors ${tone}`}
      >
        {item.repostCount} {item.repostCount === 1 ? "repost" : "reposts"}
      </button>
      <Modal
        open={dialog === "repost"}
        onCancel={() => setDialog(null)}
        footer={null}
        width={520}
        destroyOnHidden
        title={null}
        styles={{ container: { padding: 24 } }}
      >
        <RepostForm item={item} onCancel={() => setDialog(null)} onReposted={reposted} />
      </Modal>
      <Modal
        open={dialog === "quote"}
        onCancel={() => setDialog(null)}
        footer={null}
        width={640}
        destroyOnHidden
        title={null}
        styles={{ container: { padding: 24 } }}
      >
        <QuoteForm item={item} onQuoted={quoted} onPosted={() => setDialog(null)} />
      </Modal>
      <Modal
        open={dialog === "list"}
        onCancel={() => setDialog(null)}
        footer={null}
        width={640}
        destroyOnHidden
        title={null}
        styles={{ container: { padding: 24 } }}
      >
        <RepostList target={{ type: item.type, id: item.id }} />
      </Modal>
    </span>
  );
}

function RepostForm({
  item,
  onCancel,
  onReposted,
}: {
  item: FeedEntry;
  onCancel: () => void;
  onReposted: (result: RepostResult) => void;
}) {
  const page = useContext(MediaPageContext);
  const [destination, setDestination] = useState<Destination>("wall");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const { token } = useAuthStore.getState();
    if (!token) return requireLogin();
    setPending(true);
    setError(null);
    try {
      onReposted(await repost(token, item, destination === "wall" ? null : destination));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Molecule.ModalHeader
        eyebrow="Repost"
        title={`Repost this ${nouns[item.type]}.`}
        description="It shows as it is, on your wall or in the community you choose."
      />
      <div className="rounded-lg border border-divider bg-surface p-4">
        <DestinationPicker value={destination} onChange={setDestination} />
      </div>
      <QuoteEmbed quote={quotedItem(item, page)} interactive={false} />
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <div className="flex justify-end gap-2 border-t border-divider pt-6">
        <Atom.Button variant="secondary" onClick={onCancel}>
          Cancel
        </Atom.Button>
        <Atom.Button onClick={submit} loading={pending} icon={<Repeat size={14} />}>
          Repost
        </Atom.Button>
      </div>
    </div>
  );
}

function QuoteForm({
  item,
  onQuoted,
  onPosted,
}: {
  item: FeedEntry;
  onQuoted: (post: Post) => void;
  onPosted: () => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const communities = useCommunityStore((state) => state.communities);
  const page = useContext(MediaPageContext);
  const [destination, setDestination] = useState<Destination>("wall");
  const community =
    destination === "wall" ? undefined : communities.find(({ id }) => id === destination);

  async function post(content: string, linkUrl?: string, spoiler?: string | null) {
    const { token } = useAuthStore.getState();
    if (!token || !profile) throw new Error("Please log in again.");
    const quote: ShareTarget = { type: item.type, id: item.id };
    onQuoted(
      community
        ? await createPost(token, community.id, content, linkUrl, spoiler, quote)
        : await createWallPost(token, profile.username, content, linkUrl, spoiler, quote),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Molecule.ModalHeader eyebrow="Quote" title={`Quote this ${nouns[item.type]}.`} />
      <PostComposer
        autoFocus
        linkPreview
        onPost={post}
        onPosted={onPosted}
        placeholder="Add your thoughts…"
        target={<DestinationPicker value={community?.id ?? "wall"} onChange={setDestination} />}
        embed={<QuoteEmbed quote={quotedItem(item, page)} interactive={false} />}
      />
    </div>
  );
}

function usePages<T>(load: (token: string, cursor?: string) => Promise<Page<T>>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    let ignore = false;
    load(token)
      .then((page) => {
        if (ignore) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [load, attempt]);

  function loadMore() {
    const { token } = useAuthStore.getState();
    if (!token || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    load(token, nextCursor)
      .then((page) => {
        setItems((current) => [...(current ?? []), ...page.items]);
        setNextCursor(page.nextCursor);
      })
      .catch(() => setMoreFailed(true))
      .finally(() => setLoadingMore(false));
  }

  return {
    items,
    setItems,
    failed,
    retry: () => {
      setFailed(false);
      setAttempt((count) => count + 1);
    },
    more: nextCursor !== null && (
      <Molecule.LoadMore onLoadMore={loadMore} loading={loadingMore} failed={moreFailed} />
    ),
  };
}

function RepostList({ target }: { target: ShareTarget }) {
  const [tab, setTab] = useState<"reposts" | "quotes">("reposts");

  return (
    <div className="flex flex-col gap-6">
      <Molecule.ModalHeader eyebrow="Reposts" title={`Who shared this ${nouns[target.type]}.`} />
      <Segmented<"reposts" | "quotes">
        block
        value={tab}
        onChange={setTab}
        options={[
          { value: "reposts", label: "Reposts" },
          { value: "quotes", label: "Quotes" },
        ]}
      />
      {tab === "reposts" ? <Reposters target={target} /> : <Quotes target={target} />}
    </div>
  );
}

function ListState({
  failed,
  onRetry,
  empty,
}: {
  failed: boolean;
  onRetry: () => void;
  empty?: string;
}) {
  if (failed) {
    return (
      <div role="alert" className="flex flex-col items-center gap-2 py-4 text-center">
        <p className="text-sm text-muted">This list couldn’t be loaded.</p>
        <Atom.Button variant="secondary" onClick={onRetry}>
          Try again
        </Atom.Button>
      </div>
    );
  }
  if (empty) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <div className="flex min-h-24">
      <Atom.Loader />
    </div>
  );
}

function Reposters({ target: { type, id } }: { target: ShareTarget }) {
  const list = usePages(
    useCallback(
      (token: string, cursor?: string) => getReposters(token, { type, id }, cursor),
      [type, id],
    ),
  );

  if (!list.items || list.items.length === 0) {
    return (
      <ListState
        failed={list.failed}
        onRetry={list.retry}
        empty={list.items ? "No reposts yet." : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col divide-y divide-divider">
        {list.items.map((person) => (
          <li key={person.id} className="flex items-center gap-3 py-2">
            <Molecule.AuthorAvatar author={person} />
            <div className="flex min-w-0 flex-1 flex-col">
              <Molecule.UserLink
                username={person.username}
                className="truncate text-[13px] font-semibold"
              >
                {displayName(person)}
              </Molecule.UserLink>
              <span className="truncate text-xs text-muted">
                @{person.username} · {timeAgo(person.repostedAt)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {list.more}
    </div>
  );
}

function Quotes({ target: { type, id } }: { target: ShareTarget }) {
  const list = usePages(
    useCallback(
      (token: string, cursor?: string) => getQuotes(token, { type, id }, cursor),
      [type, id],
    ),
  );
  const [openId, setOpenId] = useState<number | null>(null);
  const open = list.items?.find((post) => post.id === openId) ?? null;
  const update = (entry: FeedEntry) =>
    list.setItems((current) =>
      (current ?? []).map((post) => (entry.type === "post" && post.id === entry.id ? entry : post)),
    );
  const remove = (entry: FeedEntry) =>
    list.setItems((current) => (current ?? []).filter((post) => post.id !== entry.id));

  if (!list.items || list.items.length === 0) {
    return (
      <ListState
        failed={list.failed}
        onRetry={list.retry}
        empty={list.items ? "No quotes yet." : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {list.items.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          showCommunity
          preview={false}
          onOpenComments={() => setOpenId(post.id)}
          onChange={update}
          onDelete={remove}
        />
      ))}
      {list.more}
      <DiscussionModal
        item={open}
        onClose={() => setOpenId(null)}
        onChange={update}
        onDelete={remove}
      />
    </div>
  );
}

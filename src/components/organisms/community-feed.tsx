"use client";

import { Segmented, Switch } from "antd";
import { LayoutList } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import {
  createPost,
  createThread,
  getPosts,
  type FeedContentType,
  type FeedEntry,
  type ThreadRange,
  type ThreadSort,
} from "@/lib/api";
import { usePaged } from "@/lib/use-paged";
import { useAuthStore } from "@/stores/auth-store";
import { ForumThreads, threadSorts } from "./community-forum";
import { PostComposer } from "./post-composer";
import { PostList } from "./post-list";

type ListSort = "all" | ThreadSort;

const listSorts = [
  { value: "all", label: "All", icon: <LayoutList size={14} /> },
  ...threadSorts,
] satisfies { value: ListSort; label: string; icon: ReactNode }[];

function CommunityComposer({
  communityId,
  onPosted,
}: {
  communityId: number;
  onPosted: (item: FeedEntry) => void;
}) {
  const [thread, setThread] = useState(false);
  const [title, setTitle] = useState("");

  async function handlePost(content: string, linkUrl?: string) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    onPosted(
      thread
        ? await createThread(token, communityId, { title: title.trim(), content, linkUrl })
        : await createPost(token, communityId, content, linkUrl),
    );
  }

  return (
    <div data-tour="community-composer">
      <PostComposer
        linkPreview
        allowEmpty={thread}
        submitDisabled={thread && !title.trim()}
        placeholder={thread ? "Add details or context…" : "Share something with the community…"}
        target={
          thread && (
            <Atom.Input
              variant="borderless"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={300}
              placeholder="Thread title"
              aria-label="Thread title"
              className="font-display text-2xl font-bold"
            />
          )
        }
        actions={
          <label
            data-tour="community-tabs"
            className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted"
          >
            <Switch size="small" checked={thread} onChange={setThread} />
            Thread
          </label>
        }
        onPost={handlePost}
        onPosted={() => setTitle("")}
      />
    </div>
  );
}

export function CommunityFeed({
  communityId,
  joinPrompt,
  initialSort = "all",
}: {
  communityId: number;
  joinPrompt?: ReactNode;
  initialSort?: ListSort;
}) {
  const [sort, setSort] = useState<ListSort>(initialSort);
  const [range, setRange] = useState<ThreadRange>("day");
  const [version, setVersion] = useState(0);
  const feed = usePaged(
    useCallback(
      (token: string | null, cursor?: string, excluded?: FeedContentType[]) =>
        getPosts(token, communityId, cursor, excluded),
      [communityId],
    ),
    { live: true, guest: true, types: ["post", "thread", "activity"] },
  );

  function handlePosted(item: FeedEntry) {
    if (sort === "all" || item.type !== "thread") {
      setSort("all");
      feed.prepend(item);
      return;
    }
    setSort("new");
    setRange("day");
    setVersion((count) => count + 1);
  }

  const sortControl = (
    <Segmented<ListSort>
      aria-label="Show"
      size="small"
      className="!bg-surface !shadow-[inset_0_0_0_1px_var(--divider)] max-sm:[&_.ant-segmented-item-icon]:hidden [&_.ant-segmented-item-selected]:!bg-rail [&_.ant-segmented-thumb]:!bg-rail"
      options={listSorts}
      value={sort}
      onChange={setSort}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {joinPrompt ?? <CommunityComposer communityId={communityId} onPosted={handlePosted} />}
      {sort === "all" ? (
        <PostList
          feed={feed}
          trailing={sortControl}
          empty={{
            title: "No posts yet.",
            description: "Be the first to share a post with this community.",
          }}
        />
      ) : (
        <ForumThreads
          key={`${sort}-${range}-${version}`}
          communityId={communityId}
          sort={sort}
          range={range}
          onRangeChange={setRange}
          trailing={sortControl}
        />
      )}
    </div>
  );
}

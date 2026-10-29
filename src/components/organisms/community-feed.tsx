"use client";

import { useCallback, type ReactNode } from "react";
import { createPost, getPosts, type FeedContentType } from "@/lib/api";
import { usePaged } from "@/lib/use-paged";
import { useAuthStore } from "@/stores/auth-store";
import { PostComposer } from "./post-composer";
import { PostList } from "./post-list";

export function CommunityFeed({
  communityId,
  joinPrompt,
}: {
  communityId: number;
  joinPrompt?: ReactNode;
}) {
  const feed = usePaged(
    useCallback(
      (token: string | null, cursor?: string, excluded?: FeedContentType[]) =>
        getPosts(token, communityId, cursor, excluded),
      [communityId],
    ),
    { live: true, guest: true, types: ["post", "activity"] },
  );

  async function handlePost(content: string, linkUrl?: string) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    feed.prepend(await createPost(token, communityId, content, linkUrl));
  }

  return (
    <div className="flex flex-col gap-3">
      {joinPrompt ?? (
        <div data-tour="community-composer">
          <PostComposer linkPreview onPost={handlePost} />
        </div>
      )}
      <PostList
        feed={feed}
        empty={{
          title: "No posts yet.",
          description: "Be the first to share a post with this community.",
        }}
      />
    </div>
  );
}

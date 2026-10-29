"use client";

import { Modal } from "antd";
import * as Molecule from "@molecule";
import type { FeedEntry } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { ActivityCard } from "./activity-card";
import { CommentSection } from "./comment-section";
import { PostCard } from "./post-card";

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
                  ? `${item.community.name} / Feed`
                  : `${item.type === "post" && item.wallUser ? displayName(item.wallUser) : "Profile"} / Wall`
            }
            title="The discussion"
          />
          {item.type === "activity" ? (
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

"use client";

import { App, Tooltip } from "antd";
import { LogOut } from "lucide-react";
import type { Community } from "@/lib/api";
import { useReadOnly } from "@/lib/read-only";
import { useCommunityStore } from "@/stores/community-store";

export function useLeaveCommunity() {
  const { modal, message } = App.useApp();
  const leaveCommunity = useCommunityStore((state) => state.leaveCommunity);

  return function confirmLeave(community: Community, onLeft?: () => void) {
    if (community.role === "owner") {
      modal.info({
        title: "You own this community",
        content:
          "Owners can’t leave their own community. If you want to step away, delete it in Community settings instead.",
        okText: "Got it",
      });
      return;
    }

    modal.confirm({
      title: `Leave ${community.name}?`,
      content: community.isPublic
        ? "It disappears from your communities. You can join again any time."
        : "It’s private, so you’ll need a new invite to join again.",
      okText: "Leave",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () =>
        leaveCommunity(community.id)
          .then(() => {
            message.success(`You left ${community.name}.`);
            onLeft?.();
          })
          .catch((error: Error) => {
            message.error(error.message);
          }),
    });
  };
}

export function LeaveCommunityButton({ community }: { community: Community }) {
  const readOnly = useReadOnly();
  const confirmLeave = useLeaveCommunity();

  return (
    <Tooltip
      title={readOnly ? "Confirm your email first to leave communities." : "Leave community"}
      classNames={{ root: "touch-visible" }}
    >
      <span className="inline-flex">
        <button
          type="button"
          aria-label="Leave community"
          disabled={readOnly}
          onClick={() => confirmLeave(community)}
          className="icon-button cursor-pointer disabled:pointer-events-none disabled:opacity-40"
        >
          <LogOut size={20} />
        </button>
      </span>
    </Tooltip>
  );
}

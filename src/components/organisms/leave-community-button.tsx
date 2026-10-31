"use client";

import { App } from "antd";
import type { Community } from "@/lib/api";
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

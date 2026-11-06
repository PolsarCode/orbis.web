"use client";

import { useEffect } from "react";
import { setDesktopBadge } from "@/lib/desktop";
import { useMessagesStore } from "@/stores/messages-store";
import { useNotificationsStore } from "@/stores/notifications-store";

export function DesktopBadge() {
  const notifications = useNotificationsStore((state) => state.unreadCount);
  const chats = useMessagesStore(
    (state) =>
      state.conversations.filter(
        ({ status, unread, muted }) => status === "accepted" && unread > 0 && !muted,
      ).length,
  );
  const count = notifications + chats;

  useEffect(() => {
    setDesktopBadge(count).catch(() => null);
  }, [count]);

  return null;
}

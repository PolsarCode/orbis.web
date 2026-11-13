"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Notification } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationsStore } from "@/stores/notifications-store";
import { NotificationPicture, NotificationText } from "./notification-center";

const SHOW_MS = 5000;
const FADE_MS = 300;

function Toast({ notification }: { notification: Notification }) {
  const dismiss = useNotificationsStore((state) => state.dismissToast);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    const fadeOut = setTimeout(() => setShown(false), SHOW_MS);
    const remove = setTimeout(
      () => dismiss(notification.id),
      SHOW_MS + FADE_MS,
    );
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fadeOut);
      clearTimeout(remove);
    };
  }, [dismiss, notification.id]);

  return (
    <Link
      href={notification.link}
      prefetch={false}
      onClick={() => dismiss(notification.id)}
      className={`focus-ring pointer-events-auto flex w-72 items-center gap-3 rounded-xl border border-divider bg-surface p-3 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)] transition-[opacity,transform] duration-300 ease-out hover:bg-rail-item motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <NotificationPicture notification={notification} />
      <span className="min-w-0 flex-1 text-sm">
        <NotificationText notification={notification} />
      </span>
    </Link>
  );
}

export function NotificationToasts() {
  const profile = useAuthStore((state) => state.profile);
  const toasts = useNotificationsStore((state) => state.toasts);

  if (!profile || toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-16 z-40 flex flex-col-reverse gap-2 sm:bottom-6 sm:left-24"
    >
      {toasts.map(({ id, notification }) => (
        <Toast key={id} notification={notification} />
      ))}
    </div>
  );
}

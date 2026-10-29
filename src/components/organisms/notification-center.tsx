"use client";

import { Switch } from "antd";
import {
  AtSign,
  Bell,
  CheckCheck,
  CircleCheck,
  Inbox,
  CloudOff,
  MessageSquare,
  PenLine,
  Reply,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Template from "@template";
import {
  getNotifications,
  type Notification,
  type NotificationFilter,
  type NotificationType,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { timeAgo } from "@/lib/time";
import { useTabScroller } from "@/lib/use-tab-scroller";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationsStore } from "@/stores/notifications-store";
import { FriendsPanel } from "./friends-panel";
import { SidePanel } from "./side-panel";
import { SearchScope } from "./site-search";

const typeIcons: Record<NotificationType, ReactNode> = {
  post_comment: <MessageSquare size={12} />,
  comment_reply: <Reply size={12} />,
  friend_request: <UserPlus size={12} />,
  friend_accepted: <UserCheck size={12} />,
  report_status: <CircleCheck size={12} />,
  report_assigned: <UserCheck size={12} />,
  report_comment: <MessageSquare size={12} />,
  wall_post: <PenLine size={12} />,
  mention: <AtSign size={12} />,
};

const filters: { value: NotificationFilter; label: string; icon: ReactNode }[] = [
  { value: "all", label: "All", icon: <Inbox size={16} /> },
  { value: "comments", label: "Posts & comments", icon: <MessageSquare size={16} /> },
  { value: "friends", label: "Friends", icon: <Users size={16} /> },
  { value: "reports", label: "Reports", icon: <CircleCheck size={16} /> },
];

export function NotificationRow({
  notification,
  onOpen,
  compact = false,
}: {
  notification: Notification;
  onOpen: () => void;
  compact?: boolean;
}) {
  const { actor } = notification;
  const name = actor ? displayName(actor) : "Orbis";
  const unread = !notification.readAt;

  return (
    <li>
      <Link
        href={notification.link}
        prefetch={false}
        onClick={onOpen}
        className={
          compact
            ? `focus-ring flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-rail-item/50 ${
                unread ? "bg-accent-soft" : ""
              }`
            : `focus-ring flex items-start gap-3 rounded-lg border p-4 transition-colors hover:border-muted ${
                unread ? "border-accent/40 bg-accent-soft" : "border-divider bg-surface"
              }`
        }
      >
        <span className="relative shrink-0">
          <Atom.Avatar label={name} src={actor?.avatarUrl} seed={actor?.id ?? 0} />
          <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border border-divider bg-surface text-foreground">
            {typeIcons[notification.type]}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm">
            <span className="font-semibold">{name}</span> {notification.message}
          </span>
          <span className="text-xs text-muted">{timeAgo(notification.createdAt)}</span>
        </span>
        {unread && (
          <span aria-label="Unread" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
        )}
      </Link>
    </li>
  );
}

function NotificationResults({ query }: { query: string }) {
  const markRead = useNotificationsStore((state) => state.markRead);
  const [results, setResults] = useState<{
    query: string;
    items: Notification[] | null;
  } | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    let ignore = false;
    getNotifications(token, { q: query })
      .then((page) => {
        if (!ignore) setResults({ query, items: page.items });
      })
      .catch(() => {
        if (!ignore) setResults({ query, items: null });
      });
    return () => {
      ignore = true;
    };
  }, [query]);

  if (!results || results.query !== query) {
    return (
      <div className="flex justify-center py-4">
        <Atom.Loader />
      </div>
    );
  }
  if (!results.items) {
    return <Atom.ErrorMessage>Could not search notifications.</Atom.ErrorMessage>;
  }
  if (results.items.length === 0) {
    return <p className="py-4 text-center text-sm text-muted">Nothing matches “{query}”.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {results.items.map((notification) => (
        <NotificationRow
          key={notification.id}
          notification={notification}
          compact
          onOpen={() => {
            if (!notification.readAt) markRead(notification.id);
          }}
        />
      ))}
    </ul>
  );
}

export function NotificationSearchScope() {
  return (
    <SearchScope
      section={{
        label: "Notifications",
        render: (query) => <NotificationResults query={query} />,
      }}
    />
  );
}

function UnreadBar() {
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const [pending, setPending] = useState(false);

  if (unreadCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent-soft px-4 py-3">
      <Bell size={16} className="shrink-0 text-accent" aria-hidden />
      <span className="flex-1 text-sm font-semibold">
        {unreadCount.toLocaleString()} unread {unreadCount === 1 ? "notification" : "notifications"}
      </span>
      <Atom.Button
        size="small"
        icon={<CheckCheck size={14} />}
        loading={pending}
        onClick={async () => {
          setPending(true);
          try {
            await markAllRead();
          } finally {
            setPending(false);
          }
        }}
      >
        Mark all as read
      </Atom.Button>
    </div>
  );
}

export function NotificationCenter() {
  const version = useNotificationsStore((state) => state.version);
  const markRead = useNotificationsStore((state) => state.markRead);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    let ignore = false;
    getNotifications(token, { filter, unread: unreadOnly })
      .then((page) => {
        if (ignore) return;
        setFailed(false);
        setItems(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });

    return () => {
      ignore = true;
    };
  }, [filter, unreadOnly, version, attempt]);

  function loadMore() {
    const { token } = useAuthStore.getState();
    if (!token || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    setMoreFailed(false);
    getNotifications(token, { cursor: nextCursor, filter, unread: unreadOnly })
      .then((page) => {
        setItems((current) => {
          const seen = new Set(current?.map(({ id }) => id));
          return [...(current ?? []), ...page.items.filter(({ id }) => !seen.has(id))];
        });
        setNextCursor(page.nextCursor);
      })
      .catch(() => setMoreFailed(true))
      .finally(() => setLoadingMore(false));
  }

  function open(notification: Notification) {
    if (notification.readAt) return;
    markRead(notification.id);
    setItems((current) =>
      current?.map((item) =>
        item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
      ) ?? null,
    );
  }

  const filtered = filter !== "all" || unreadOnly;
  const [tabsRef, tabsFade] = useTabScroller<HTMLDivElement>(filter);

  return (
    <>
      <nav
        aria-label="Notification filters"
        className="flex shrink-0 items-end gap-6 border-b border-divider px-4 max-sm:flex-wrap max-sm:gap-y-0 sm:px-8"
      >
        <div
          ref={tabsRef}
          style={tabsFade}
          className="-mb-px flex min-w-0 items-end gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
        >
          {filters.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`focus-ring flex shrink-0 cursor-pointer items-center gap-2 rounded-t-sm border-b-2 px-1 py-3 text-sm whitespace-nowrap transition-colors ${
                filter === value
                  ? "border-accent text-accent"
                  : "border-transparent font-semibold text-foreground hover:text-accent"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex shrink-0 items-center gap-2 self-center text-xs whitespace-nowrap max-sm:order-first max-sm:ml-0 max-sm:w-full max-sm:pt-3">
          <Switch size="small" checked={unreadOnly} onChange={setUnreadOnly} />
          Unread only
        </label>
      </nav>
      <div className="flex min-h-0 flex-1">
        <Template.PageColumn>
          <div className="flex flex-col gap-6">
            <UnreadBar />
            {failed && !items ? (
              <Molecule.FeedState
                role="alert"
                eyebrow="Connection error"
                icon={<CloudOff size={24} strokeWidth={1.5} />}
                title="Notifications couldn’t be loaded."
                description="Check your connection and try again."
                action={<Atom.Button onClick={() => setAttempt((count) => count + 1)}>Try again</Atom.Button>}
              />
            ) : !items ? (
              <Molecule.FeedSkeleton label="Loading notifications…" />
            ) : items.length === 0 ? (
              <Molecule.FeedState
                eyebrow={filtered ? "No matches" : "Empty"}
                icon={<Bell size={24} strokeWidth={1.5} />}
                title={filtered ? "Nothing matches." : "No notifications yet."}
                description={
                  filtered
                    ? "Try a different filter."
                    : "When someone comments, replies, or adds you, it’ll show up here."
                }
              />
            ) : (
              <div className="flex flex-col gap-2">
                <ul className="flex flex-col gap-2">
                  {items.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      onOpen={() => open(notification)}
                    />
                  ))}
                </ul>
                {nextCursor ? (
                  <Molecule.LoadMore onLoadMore={loadMore} loading={loadingMore} failed={moreFailed} />
                ) : (
                  <Molecule.FeedEnd label="That’s everything" />
                )}
              </div>
            )}
          </div>
        </Template.PageColumn>
        <SidePanel label="Friends">
          <FriendsPanel />
        </SidePanel>
      </div>
    </>
  );
}

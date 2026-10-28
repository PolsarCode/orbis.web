"use client";

import { Menu, MessageCircle, UserPlus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { useFriendsStore } from "@/stores/friends-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useMessagesStore } from "@/stores/messages-store";
import { HEADER_POPOVER_LIMIT, HeaderPopover, HeaderPopoverNote } from "./header-popover";
import { ConversationRow } from "./messages-view";
import { NotificationBell } from "./notification-bell";
import { PersonRow } from "./person-row";
import { SidePanelOpener } from "./side-panel";
import { SiteSearch } from "./site-search";
import { UserMenu } from "./user-menu";

function itemClass(active: boolean) {
  return `focus-ring relative flex h-10 w-10 items-center justify-center rounded-full transition-colors motion-reduce:transition-none ${
    active
      ? "bg-accent text-accent-foreground"
      : "text-foreground hover:bg-rail-item"
  }`;
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span
      aria-hidden
      className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-rail bg-accent px-1 font-sans text-[10px] leading-none font-bold text-accent-foreground"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function RequestsButton() {
  const incoming = useFriendsStore((state) => state.incoming);
  const loaded = useFriendsStore((state) => state.loaded);
  const addFriend = useFriendsStore((state) => state.addFriend);
  const removeFriend = useFriendsStore((state) => state.removeFriend);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const active = open || pathname === "/requests";
  const pending = incoming.length;
  const label = pending > 0 ? `Friend requests, ${pending} pending` : "Friend requests";

  return (
    <HeaderPopover
      open={open}
      onOpenChange={setOpen}
      title="Friend requests"
      href="/requests"
      action="See all requests"
      content={
        !loaded ? (
          <div className="flex py-6">
            <Atom.Loader />
          </div>
        ) : pending === 0 ? (
          <HeaderPopoverNote>No friend requests.</HeaderPopoverNote>
        ) : (
          <ul className="flex flex-col">
            {incoming.slice(0, HEADER_POPOVER_LIMIT).map((user) => (
              <PersonRow
                key={user.userId}
                person={user}
                actions={
                  <>
                    <Molecule.ReadOnlyGate action="answer friend requests">
                      <Atom.Button
                        size="small"
                        onClick={() => addFriend({ userId: user.userId }).catch(() => null)}
                      >
                        Accept
                      </Atom.Button>
                    </Molecule.ReadOnlyGate>
                    <Molecule.ReadOnlyGate action="answer friend requests">
                      <Atom.Button
                        size="small"
                        variant="secondary"
                        onClick={() => removeFriend(user.userId).catch(() => null)}
                      >
                        Decline
                      </Atom.Button>
                    </Molecule.ReadOnlyGate>
                  </>
                }
              />
            ))}
          </ul>
        )
      }
    >
      <button
        type="button"
        data-tour="friend-requests"
        aria-label={label}
        aria-expanded={open}
        className={`cursor-pointer ${itemClass(active)}`}
      >
        <UserPlus size={20} />
        <CountBadge count={pending} />
      </button>
    </HeaderPopover>
  );
}

function MessagesButton() {
  const conversations = useMessagesStore((state) => state.conversations);
  const loaded = useMessagesStore((state) => state.loaded);
  const pageOpen = useMessagesStore((state) => state.pageOpen);
  const openChat = useMessagesStore((state) => state.openChat);
  const select = useMessagesStore((state) => state.select);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const active = open || pathname === "/messages";
  const chats = conversations.filter(({ status }) => status === "accepted");
  const unread = chats.filter((chat) => chat.unread > 0).length;
  const label = unread > 0 ? `Messages, ${unread} unread` : "Messages";

  return (
    <HeaderPopover
      open={open}
      onOpenChange={setOpen}
      title="Messages"
      href="/messages"
      action="See all messages"
      content={
        !loaded ? (
          <div className="flex py-6">
            <Atom.Loader />
          </div>
        ) : chats.length === 0 ? (
          <HeaderPopoverNote>No chats yet.</HeaderPopoverNote>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {chats.slice(0, HEADER_POPOVER_LIMIT).map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={false}
                onSelect={() => {
                  setOpen(false);
                  if (pageOpen) select(conversation.id);
                  else openChat(conversation.id);
                }}
              />
            ))}
          </ul>
        )
      }
    >
      <button
        type="button"
        data-tour="messages"
        aria-label={label}
        aria-expanded={open}
        className={`cursor-pointer ${itemClass(active)}`}
      >
        <MessageCircle size={20} />
        <CountBadge count={unread} />
      </button>
    </HeaderPopover>
  );
}

export function TopBar() {
  const setRailOpen = useLayoutStore((state) => state.setRailOpen);
  return (
    <header className="grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-rail px-4 sm:h-16 sm:grid-cols-[1fr_minmax(0,28rem)_1fr] sm:gap-6 sm:px-8">
      <div className="-ml-2 flex sm:ml-0 sm:block">
        <button
          type="button"
          aria-label="Show communities"
          onClick={() => setRailOpen(true)}
          className={`cursor-pointer sm:hidden ${itemClass(false)}`}
        >
          <Menu size={20} />
        </button>
      </div>
      <div className="min-w-0">
        <SiteSearch />
      </div>
      <div className="flex items-center justify-end gap-1 sm:gap-2">
        <RequestsButton />
        <MessagesButton />
        <NotificationBell className={itemClass} />
        <UserMenu />
        <SidePanelOpener />
      </div>
    </header>
  );
}

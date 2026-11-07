"use client";

import { App, Tooltip } from "antd";
import { Bell, BellOff, MessageCircle, Minus, Settings2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import type { Conversation } from "@/lib/api";
import { chatTitle } from "@/lib/chat";
import { displayName } from "@/lib/display-name";
import { useIsDesktop } from "@/lib/use-is-desktop";
import { useAuthStore } from "@/stores/auth-store";
import { personOf, useMessagesStore, type ChatPerson } from "@/stores/messages-store";
import { ChatConversation } from "./chat-conversation";
import { AddPeopleModal, GroupSettingsModal } from "./group-chat-modals";

export function useShowChat() {
  const router = useRouter();
  const desktop = useIsDesktop();

  return (id: number) => {
    const { pageOpen, select, openChat } = useMessagesStore.getState();
    if (desktop && !pageOpen) {
      openChat(id);
      return;
    }
    select(id);
    if (!pageOpen) router.push("/messages");
  };
}

export function useStartChat() {
  const showChat = useShowChat();
  return (person: ChatPerson) =>
    useMessagesStore
      .getState()
      .openDirect(person)
      .then(showChat)
      .catch(() => null);
}

export function MessageButton({
  person,
  compact = false,
}: {
  person: ChatPerson;
  compact?: boolean;
}) {
  const startChat = useStartChat();
  const label = `Message ${displayName(person)}`;

  if (compact) {
    return (
      <Tooltip title="Message">
        <button
          type="button"
          aria-label={label}
          onClick={() => startChat(personOf(person))}
          className="icon-button"
        >
          <MessageCircle size={16} />
        </button>
      </Tooltip>
    );
  }
  return (
    <Atom.Button
      size="small"
      variant="secondary"
      aria-label={label}
      icon={<MessageCircle size={12} />}
      onClick={() => startChat(personOf(person))}
      className="h-6 shrink-0 gap-1 border-transparent bg-accent px-2 text-xs text-accent-foreground hover:opacity-90"
    >
      Message
    </Atom.Button>
  );
}

export function ChatDock() {
  const profile = useAuthStore((state) => state.profile);
  const windows = useMessagesStore((state) => state.windows);
  const pageOpen = useMessagesStore((state) => state.pageOpen);

  if (!profile || pageOpen || windows.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-24 bottom-0 z-40 hidden flex-row-reverse items-end gap-3 lg:flex">
      {windows.map(({ id, minimized }) => (
        <ChatWindow key={id} id={id} minimized={minimized} />
      ))}
    </div>
  );
}

export function ChatHeading({
  conversation,
  size = "sm",
  subtitle,
}: {
  conversation: Conversation;
  size?: "sm" | "md";
  subtitle?: boolean;
}) {
  const title = chatTitle(conversation);
  const direct = !conversation.isGroup ? conversation.members[0] : undefined;
  const body = (
    <>
      <Molecule.ConversationAvatar conversation={conversation} size={size} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{title}</span>
        {subtitle && !direct?.deleted && (
          <span className="truncate text-xs text-muted">
            {direct
              ? `@${direct.username}`
              : `${conversation.members.length + 1} people`}
          </span>
        )}
      </span>
    </>
  );

  return direct && !direct.deleted ? (
    <Link
      href={`/users/${direct.username}`}
      className="focus-ring flex min-w-0 items-center gap-2 rounded-lg p-1 hover:bg-rail-item"
    >
      {body}
    </Link>
  ) : (
    <span className="flex min-w-0 items-center gap-2 p-1">{body}</span>
  );
}

export function GroupSettingsButton({ conversation }: { conversation: Conversation }) {
  const [open, setOpen] = useState(false);
  if (!conversation.isGroup) return null;

  return (
    <>
      <Tooltip title="Group settings">
        <button
          type="button"
          aria-label="Group settings"
          onClick={() => setOpen(true)}
          className="icon-button"
        >
          <Settings2 size={16} />
        </button>
      </Tooltip>
      <GroupSettingsModal conversation={conversation} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function MuteChatButton({ conversation }: { conversation: Conversation }) {
  const { message } = App.useApp();
  const setMuted = useMessagesStore((state) => state.setMuted);
  const muted = Boolean(conversation.muted);
  const label = muted ? "Unmute conversation" : "Mute conversation";

  return (
    <Tooltip title={label}>
      <button
        type="button"
        aria-label={label}
        onClick={() =>
          setMuted(conversation.id, !muted).catch((error: Error) => message.error(error.message))
        }
        className="icon-button"
      >
        {muted ? <BellOff size={16} /> : <Bell size={16} />}
      </button>
    </Tooltip>
  );
}

export function AddPeopleButton({ conversation }: { conversation: Conversation }) {
  const [open, setOpen] = useState(false);
  const showChat = useShowChat();
  if (conversation.status !== "accepted" || conversation.members.some(({ deleted }) => deleted)) {
    return null;
  }

  return (
    <>
      <Tooltip title="Add people">
        <button
          type="button"
          aria-label="Add people"
          onClick={() => setOpen(true)}
          className="icon-button"
        >
          <UserPlus size={16} />
        </button>
      </Tooltip>
      <AddPeopleModal
        conversation={conversation}
        open={open}
        onClose={() => setOpen(false)}
        onDone={(id) => {
          if (id !== conversation.id) showChat(id);
        }}
      />
    </>
  );
}

function ChatWindow({ id, minimized }: { id: number; minimized: boolean }) {
  const toggleChat = useMessagesStore((state) => state.toggleChat);
  const closeChat = useMessagesStore((state) => state.closeChat);
  const conversation = useMessagesStore((state) =>
    state.conversations.find((current) => current.id === id),
  );
  if (!conversation) return null;

  const title = chatTitle(conversation);
  const { unread } = conversation;

  return (
    <section
      aria-label={`Chat with ${title}`}
      className={`pointer-events-auto flex flex-col overflow-hidden rounded-t-2xl border border-b-0 border-divider bg-surface shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)] ${
        minimized ? "w-60" : "h-[440px] max-h-[calc(100dvh-5rem)] w-[328px]"
      }`}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-divider py-1.5 pr-1.5 pl-2">
        {minimized ? (
          <button
            type="button"
            onClick={() => toggleChat(id)}
            aria-expanded={false}
            className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left hover:bg-rail-item"
          >
            <Molecule.ConversationAvatar conversation={conversation} size="sm" />
            <span className="truncate text-sm font-semibold">{title}</span>
            {unread > 0 && (
              <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] leading-[18px] font-bold text-accent-foreground">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        ) : (
          <>
            <ChatHeading conversation={conversation} />
            <span className="flex-1" />
            <AddPeopleButton conversation={conversation} />
            <GroupSettingsButton conversation={conversation} />
            <MuteChatButton conversation={conversation} />
            <button
              type="button"
              onClick={() => toggleChat(id)}
              aria-label={`Minimize chat with ${title}`}
              className="icon-button"
            >
              <Minus size={16} />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => closeChat(id)}
          aria-label={`Close chat with ${title}`}
          className="icon-button"
        >
          <X size={16} />
        </button>
      </header>
      {!minimized && <ChatConversation id={id} active />}
    </section>
  );
}

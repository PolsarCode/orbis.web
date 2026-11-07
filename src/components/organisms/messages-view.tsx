"use client";

import { Segmented, Tooltip } from "antd";
import { ArrowLeft, BellOff, MessageCircle, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import type { Conversation } from "@/lib/api";
import { chatPreview, chatTitle } from "@/lib/chat";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { useFriendsStore } from "@/stores/friends-store";
import { useMessagesStore } from "@/stores/messages-store";
import { AddPeopleButton, ChatHeading, GroupSettingsButton, MuteChatButton } from "./chat-dock";
import { ChatConversation } from "./chat-conversation";
import { NewGroupModal } from "./group-chat-modals";

type Folder = "chats" | "requests";

export function MessagesView() {
  const conversations = useMessagesStore((state) => state.conversations);
  const loaded = useMessagesStore((state) => state.loaded);
  const selectedId = useMessagesStore((state) => state.selected);
  const select = useMessagesStore((state) => state.select);
  const setPageOpen = useMessagesStore((state) => state.setPageOpen);
  const [folder, setFolder] = useState<Folder>("chats");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setPageOpen(true);
    return () => setPageOpen(false);
  }, [setPageOpen]);

  const listed = conversations.filter(({ lastSenderId }) => lastSenderId !== null);
  const requests = listed.filter(({ status }) => status === "request");
  const shown =
    folder === "requests" ? requests : listed.filter(({ status }) => status === "accepted");
  const selected = conversations.find(({ id }) => id === selectedId);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div
        className={`min-h-0 w-full shrink-0 flex-col border-divider sm:flex sm:w-80 sm:border-r ${
          selected ? "hidden" : "flex"
        }`}
      >
        <div className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <Segmented<Folder>
              block
              value={folder}
              onChange={setFolder}
              options={[
                { value: "chats", label: "Chats" },
                {
                  value: "requests",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      Requests
                      {requests.length > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-none font-bold text-accent-foreground tabular-nums">
                          {requests.length > 99 ? "99+" : requests.length}
                        </span>
                      )}
                    </span>
                  ),
                },
              ]}
            />
          </div>
          <Tooltip title="New group">
            <button
              type="button"
              aria-label="New group"
              data-tour="new-group"
              onClick={() => setCreating(true)}
              className="icon-button"
            >
              <UsersRound size={18} />
            </button>
          </Tooltip>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {!loaded ? (
            <div className="flex py-8">
              <Atom.Loader />
            </div>
          ) : shown.length === 0 ? (
            <p className="px-2 py-6 text-center text-[13px] text-muted">
              {folder === "requests"
                ? "No message requests. Messages from people who aren’t your friends land here first."
                : "No chats yet. Message someone from their profile or your friends list, or start a group."}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {shown.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  active={selectedId === conversation.id}
                  onSelect={() => select(conversation.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className={`min-h-0 min-w-0 flex-1 flex-col ${selected ? "flex" : "hidden sm:flex"}`}>
        {selected ? (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-divider px-4 py-2">
              <button
                type="button"
                aria-label="Back to chats"
                onClick={() => select(null)}
                className="icon-button sm:hidden"
              >
                <ArrowLeft size={18} />
              </button>
              <ChatHeading conversation={selected} size="md" subtitle />
              <span className="flex-1" />
              <AddPeopleButton conversation={selected} />
              <GroupSettingsButton conversation={selected} />
              <MuteChatButton conversation={selected} />
            </div>
            <ChatConversation id={selected.id} active />
          </>
        ) : (
          <div className="m-auto flex flex-col items-center gap-3 p-6 text-center text-muted">
            <MessageCircle size={32} strokeWidth={1.5} aria-hidden />
            <p className="text-sm">Pick a chat to read it here.</p>
          </div>
        )}
      </div>
      <NewGroupModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setFolder("chats");
          select(id);
        }}
      />
    </div>
  );
}

export function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}) {
  const me = useAuthStore((state) => state.profile?.userId);
  const other = conversation.isGroup ? undefined : conversation.members[0];
  const direct = other?.deleted ? undefined : other;
  const status = useFriendsStore(
    (state) => state.friends.find(({ userId }) => userId === direct?.userId)?.status,
  );
  const unread = conversation.unread > 0;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={`focus-ring flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
          active ? "bg-rail-item" : "hover:bg-rail-item/60"
        }`}
      >
        <Molecule.ConversationAvatar
          conversation={conversation}
          presence={status}
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1">
            <span className={`truncate text-sm ${unread ? "font-bold" : "font-semibold"}`}>
              {chatTitle(conversation)}
            </span>
            {conversation.muted && (
              <BellOff size={12} aria-label="Muted" className="shrink-0 text-muted" />
            )}
          </span>
          <span className={`flex gap-1 text-xs ${unread ? "font-semibold text-foreground" : "text-muted"}`}>
            <span className="truncate">{chatPreview(conversation, me)}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0">{timeAgo(conversation.lastAt)}</span>
          </span>
        </span>
        {unread && (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent">
            <span className="sr-only">Unread</span>
          </span>
        )}
      </button>
    </li>
  );
}

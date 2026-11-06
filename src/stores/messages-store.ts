import { create } from "zustand";
import * as api from "@/lib/api";
import type { ChatHistory, ChatMessage, ChatPerson, Conversation } from "@/lib/api";
import { playMessageSound } from "@/lib/chat-sound";
import { useAuthStore } from "./auth-store";

export type { ChatPerson };

type ChatWindow = { id: number; minimized: boolean };

type History = ChatHistory & { failed?: boolean; loadingOlder?: boolean };

type MessagesState = {
  conversations: Conversation[];
  loaded: boolean;
  failed: boolean;
  histories: Record<number, History>;
  typing: Record<number, number[]>;
  windows: ChatWindow[];
  selected: number | null;
  pageOpen: boolean;
  refresh: () => Promise<void>;
  loadHistory: (id: number) => Promise<void>;
  loadOlder: (id: number) => Promise<void>;
  send: (id: number, text: string, replyToId?: number) => Promise<void>;
  edit: (id: number, messageId: number, text: string) => Promise<void>;
  react: (id: number, messageId: number, emoji: string) => Promise<void>;
  updated: (event: { conversationId: number; message: ChatMessage }) => void;
  markRead: (id: number) => void;
  receive: (event: { conversation: Conversation; message: ChatMessage }) => void;
  upsert: (conversation: Conversation) => void;
  removed: (id: number) => void;
  seen: (event: { conversationId: number; userId: number; readAt: string }) => void;
  setTyping: (event: { conversationId: number; userId: number; typing: boolean }) => void;
  openDirect: (person: ChatPerson) => Promise<number>;
  createGroup: (userIds: number[], name?: string) => Promise<number>;
  openChat: (id: number) => void;
  closeChat: (id: number) => void;
  toggleChat: (id: number) => void;
  select: (id: number | null) => void;
  setPageOpen: (open: boolean) => void;
  acceptRequest: (id: number) => Promise<void>;
  declineRequest: (id: number) => Promise<void>;
  rename: (id: number, name: string) => Promise<void>;
  addMembers: (id: number, userIds: number[]) => Promise<void>;
  removeMember: (id: number, userId: number) => Promise<void>;
  setMuted: (id: number, muted: boolean) => Promise<void>;
};

const MAX_WINDOWS = 3;
const TYPING_TIMEOUT_MS = 6000;

const empty = {
  conversations: [],
  loaded: false,
  failed: false,
  histories: {},
  typing: {},
  windows: [],
  selected: null,
  pageOpen: false,
};

const viewing = new Set<number>();
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function markViewing(id: number, active: boolean) {
  if (active) viewing.add(id);
  else viewing.delete(id);
}

export function personOf({ userId, username, name, avatarUrl }: ChatPerson) {
  return { userId, username, name, avatarUrl };
}

function tokenOrThrow() {
  const { token } = useAuthStore.getState();
  if (!token) throw new Error("Please log in again.");
  return token;
}

function appendMessage(history: History | undefined, message: ChatMessage) {
  if (!history || history.messages.some(({ id }) => id === message.id)) return history;
  return { ...history, messages: [...history.messages, message] };
}

export const useMessagesStore = create<MessagesState>()((set, get) => {
  function patchHistory(id: number, patch: (history: History) => History | undefined) {
    const history = get().histories[id];
    const next = history && patch(history);
    if (next && next !== history) {
      set(({ histories }) => ({ histories: { ...histories, [id]: next } }));
    }
  }

  function patchConversation(id: number, patch: Partial<Conversation>) {
    set(({ conversations }) => ({
      conversations: conversations.map((conversation) =>
        conversation.id === id ? { ...conversation, ...patch } : conversation,
      ),
    }));
  }

  return {
    ...empty,
    refresh: async () => {
      const { token } = useAuthStore.getState();
      if (!token) return;

      try {
        const conversations = await api.getConversations(token);
        set({ conversations, histories: {}, loaded: true, failed: false });
      } catch {
        set({ loaded: true, failed: true });
      }
    },
    loadHistory: async (id) => {
      try {
        const history = await api.getChatHistory(tokenOrThrow(), id);
        set(({ histories }) => ({ histories: { ...histories, [id]: history } }));
      } catch {
        set(({ histories }) => ({
          histories: {
            ...histories,
            [id]: { messages: [], members: [], hasMore: false, failed: true },
          },
        }));
      }
    },
    loadOlder: async (id) => {
      const history = get().histories[id];
      if (!history?.hasMore || history.loadingOlder || history.messages.length === 0) return;

      patchHistory(id, (current) => ({ ...current, loadingOlder: true }));
      try {
        const older = await api.getChatHistory(tokenOrThrow(), id, history.messages[0].id);
        patchHistory(id, (current) => ({
          ...current,
          messages: [...older.messages, ...current.messages],
          hasMore: older.hasMore,
          loadingOlder: false,
        }));
      } catch {
        patchHistory(id, (current) => ({ ...current, loadingOlder: false }));
      }
    },
    send: async (id, text, replyToId) => {
      const message = await api.sendMessage(tokenOrThrow(), id, text, replyToId);
      patchHistory(id, (history) => appendMessage(history, message));
    },
    edit: async (id, messageId, text) => {
      const message = await api.editMessage(tokenOrThrow(), id, messageId, text);
      get().updated({ conversationId: id, message });
    },
    react: async (id, messageId, emoji) => {
      const message = await api.reactToMessage(tokenOrThrow(), id, messageId, emoji);
      get().updated({ conversationId: id, message });
    },
    updated: ({ conversationId, message }) =>
      patchHistory(conversationId, (history) => ({
        ...history,
        messages: history.messages.map((current) =>
          current.id === message.id
            ? message
            : current.replyTo?.id === message.id &&
                !message.hiddenBecause &&
                !current.replyTo.hiddenBecause
              ? { ...current, replyTo: { ...current.replyTo, text: message.text } }
              : current,
        ),
      })),
    markRead: (id) => {
      const { token } = useAuthStore.getState();
      if (!token) return;
      patchConversation(id, { unread: 0 });
      api.markMessagesRead(token, id).catch(() => null);
    },
    receive: ({ conversation, message }) => {
      const { id } = conversation;
      get().upsert(conversation);
      patchHistory(id, (history) => appendMessage(history, message));
      if (message.system) {
        if (get().histories[id]) get().loadHistory(id);
        return;
      }

      const me = useAuthStore.getState().profile?.userId;
      if (message.senderId === me) return;
      get().setTyping({ conversationId: id, userId: message.senderId, typing: false });
      if (conversation.status !== "accepted") return;
      if (get().conversations.find((current) => current.id === id)?.muted) return;
      if (message.hiddenBecause) return;

      const { pageOpen, windows } = get();
      if (!pageOpen && !windows.some((window) => window.id === id)) get().openChat(id);
      if (document.hidden || !viewing.has(id)) playMessageSound();
    },
    upsert: (conversation) =>
      set(({ conversations }) => {
        const muted =
          conversation.muted ?? conversations.find(({ id }) => id === conversation.id)?.muted;
        return {
          conversations: [
            { ...conversation, muted },
            ...conversations.filter(({ id }) => id !== conversation.id),
          ].sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
        };
      }),
    removed: (id) => {
      set(({ conversations, histories, windows, selected }) => {
        const rest = { ...histories };
        delete rest[id];
        return {
          conversations: conversations.filter((conversation) => conversation.id !== id),
          histories: rest,
          windows: windows.filter((window) => window.id !== id),
          selected: selected === id ? null : selected,
        };
      });
    },
    seen: ({ conversationId, userId, readAt }) =>
      patchHistory(conversationId, (history) => ({
        ...history,
        members: history.members.map((member) =>
          member.userId === userId ? { ...member, readAt } : member,
        ),
      })),
    setTyping: ({ conversationId, userId, typing }) => {
      const key = `${conversationId}:${userId}`;
      clearTimeout(typingTimers.get(key));
      typingTimers.delete(key);
      if (typing) {
        typingTimers.set(
          key,
          setTimeout(
            () => get().setTyping({ conversationId, userId, typing: false }),
            TYPING_TIMEOUT_MS,
          ),
        );
      }

      const current = get().typing[conversationId] ?? [];
      if (current.includes(userId) === typing) return;
      set((state) => ({
        typing: {
          ...state.typing,
          [conversationId]: typing
            ? [...current, userId]
            : current.filter((typer) => typer !== userId),
        },
      }));
    },
    openDirect: async (person) => {
      const existing = get().conversations.find(
        ({ isGroup, members }) => !isGroup && members[0]?.userId === person.userId,
      );
      if (existing) return existing.id;

      const conversation = await api.openDirectChat(tokenOrThrow(), person.userId);
      get().upsert(conversation);
      return conversation.id;
    },
    createGroup: async (userIds, name) => {
      const conversation = await api.createGroupChat(tokenOrThrow(), userIds, name);
      get().upsert(conversation);
      return conversation.id;
    },
    openChat: (id) =>
      set(({ windows }) => {
        if (windows.some((window) => window.id === id)) {
          return {
            windows: windows.map((window) =>
              window.id === id ? { ...window, minimized: false } : window,
            ),
          };
        }
        return { windows: [{ id, minimized: false }, ...windows].slice(0, MAX_WINDOWS) };
      }),
    closeChat: (id) =>
      set(({ windows }) => ({ windows: windows.filter((window) => window.id !== id) })),
    toggleChat: (id) =>
      set(({ windows }) => ({
        windows: windows.map((window) =>
          window.id === id ? { ...window, minimized: !window.minimized } : window,
        ),
      })),
    select: (selected) => set({ selected }),
    setPageOpen: (pageOpen) => set({ pageOpen }),
    acceptRequest: async (id) => {
      await api.acceptMessageRequest(tokenOrThrow(), id);
      patchConversation(id, { status: "accepted" });
    },
    declineRequest: async (id) => {
      await api.declineMessageRequest(tokenOrThrow(), id);
      get().removed(id);
    },
    rename: async (id, name) => {
      await api.renameGroupChat(tokenOrThrow(), id, name);
    },
    addMembers: async (id, userIds) => {
      await api.addGroupMembers(tokenOrThrow(), id, userIds);
    },
    removeMember: async (id, userId) => {
      await api.removeGroupMember(tokenOrThrow(), id, userId);
      if (userId === useAuthStore.getState().profile?.userId) get().removed(id);
    },
    setMuted: async (id, muted) => {
      await api.setConversationMuted(tokenOrThrow(), id, muted);
      patchConversation(id, { muted });
    },
  };
});

useAuthStore.subscribe(({ token }) => {
  if (token) return;

  viewing.clear();
  typingTimers.forEach((timer) => clearTimeout(timer));
  typingTimers.clear();
  useMessagesStore.setState(empty);
});

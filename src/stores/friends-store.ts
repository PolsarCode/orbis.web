import { io, type Socket } from "socket.io-client";
import { create } from "zustand";
import * as api from "@/lib/api";
import type {
  Friend,
  FriendSuggestion,
  FriendTarget,
  FriendUser,
  Notification,
  PresenceStatus,
} from "@/lib/api";
import { useAuthStore } from "./auth-store";
import { useCommunityStore } from "./community-store";
import { useMessagesStore } from "./messages-store";
import { useNotificationsStore } from "./notifications-store";

type FriendsState = {
  friends: Friend[];
  incoming: FriendUser[];
  outgoing: FriendUser[];
  presence: Record<number, boolean>;
  statuses: Record<number, PresenceStatus>;
  games: Record<number, string | null>;
  twitchLogins: Record<number, string | null>;
  loaded: boolean;
  suggestions: FriendSuggestion[];
  suggestionsLoaded: boolean;
  connect: () => void;
  fetchFriends: () => Promise<void>;
  fetchSuggestions: () => Promise<void>;
  addFriend: (target: FriendTarget) => Promise<void>;
  removeFriend: (userId: number) => Promise<void>;
};

const empty = {
  friends: [],
  incoming: [],
  outgoing: [],
  presence: {},
  statuses: {},
  games: {},
  twitchLogins: {},
  loaded: false,
  suggestions: [],
  suggestionsLoaded: false,
};

let socket: Socket | null = null;
let suggestionsRequest: Promise<void> | null = null;
let stopIdleTracking: (() => void) | null = null;

const IDLE_AFTER_MS = 5 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 15_000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"];

function trackIdle(client: Socket) {
  let idle = false;
  let lastActive = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function setIdle(next: boolean) {
    if (idle === next) return;
    idle = next;
    client.emit("idle", next);
  }

  function active() {
    const now = Date.now();
    if (!idle && now - lastActive < ACTIVITY_THROTTLE_MS) return;
    lastActive = now;
    setIdle(false);
    clearTimeout(timer);
    timer = setTimeout(() => setIdle(true), IDLE_AFTER_MS);
  }

  function visibility() {
    if (document.visibilityState === "visible") active();
  }

  ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, active, { passive: true }));
  document.addEventListener("visibilitychange", visibility);
  client.on("connect", () => {
    if (idle) client.emit("idle", true);
  });
  active();

  return () => {
    clearTimeout(timer);
    ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, active));
    document.removeEventListener("visibilitychange", visibility);
  };
}

export function emitTyping(conversationId: number, typing: boolean) {
  socket?.emit("typing", { conversationId, typing });
}

export const useFriendsStore = create<FriendsState>()((set, get) => ({
  ...empty,
  connect: () => {
    const { token } = useAuthStore.getState();
    if (!token || socket) return;

    socket = io(api.API_URL, { auth: { token } });
    stopIdleTracking = trackIdle(socket);
    socket.on("connect", () => {
      get().fetchFriends();
      useNotificationsStore.getState().refresh();
      useMessagesStore.getState().refresh();
    });
    socket.on(
      "notifications:changed",
      ({ notifications = [] }: { notifications?: Notification[] } = {}) => {
        useNotificationsStore.getState().refresh();
        useNotificationsStore.getState().showToasts(notifications);
      },
    );
    socket.on("friends:changed", () => get().fetchFriends());
    socket.on("community:live", ({ communityId, live }: { communityId: number; live: boolean }) =>
      useCommunityStore.getState().setLive(communityId, live),
    );
    socket.on("message", (event) => useMessagesStore.getState().receive(event));
    socket.on("message:updated", (event) => useMessagesStore.getState().updated(event));
    socket.on("conversation", ({ conversation }) =>
      useMessagesStore.getState().upsert(conversation),
    );
    socket.on("conversation:removed", ({ id }: { id: number }) =>
      useMessagesStore.getState().removed(id),
    );
    socket.on("messages:read", (event) => useMessagesStore.getState().seen(event));
    socket.on("typing", (event) => useMessagesStore.getState().setTyping(event));
    socket.on(
      "presence",
      ({
        userId,
        online,
        status,
        playing = null,
        twitchLogin = null,
      }: {
        userId: number;
        online: boolean;
        status: PresenceStatus;
        playing?: string | null;
        twitchLogin?: string | null;
      }) =>
        set((state) => ({
          friends: state.friends.map((friend) =>
            friend.userId === userId
              ? { ...friend, online, status, playing, twitchLogin }
              : friend,
          ),
          presence: { ...state.presence, [userId]: online },
          statuses: { ...state.statuses, [userId]: status },
          games: { ...state.games, [userId]: playing },
          twitchLogins: { ...state.twitchLogins, [userId]: twitchLogin },
        })),
    );
    get().fetchFriends();
    useMessagesStore.getState().refresh();
  },
  fetchFriends: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    const list = await api.getFriends(token).catch(() => null);
    if (list) set({ ...list, loaded: true });
  },
  fetchSuggestions: () => {
    const { token } = useAuthStore.getState();
    if (!token) return Promise.resolve();

    suggestionsRequest ??= api
      .getFriendSuggestions(token)
      .catch(() => [])
      .then((suggestions) => set({ suggestions, suggestionsLoaded: true }))
      .finally(() => {
        suggestionsRequest = null;
      });
    return suggestionsRequest;
  },
  addFriend: async (target) => {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    try {
      await api.addFriend(token, target);
      set((state) => ({
        suggestions: state.suggestions.filter((person) =>
          "userId" in target ? person.userId !== target.userId : person.username !== target.username,
        ),
      }));
    } finally {
      await get().fetchFriends();
    }
  },
  removeFriend: async (userId) => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    try {
      await api.removeFriend(token, userId);
    } finally {
      await get().fetchFriends();
    }
  },
}));

useAuthStore.subscribe(({ token }) => {
  if (token || !socket) return;

  stopIdleTracking?.();
  stopIdleTracking = null;
  socket.disconnect();
  socket = null;
  useFriendsStore.setState(empty);
});

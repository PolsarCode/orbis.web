import { create } from "zustand";
import * as api from "@/lib/api";
import type {
  Community,
  CommunityConnectionSetting,
  CommunityImage,
  RailItem,
} from "@/lib/api";
import { useAuthStore } from "./auth-store";

export const COMMUNITY_LEFT_EVENT = "orbis:community-left";

type CommunityState = {
  communities: Community[];
  layout: RailItem[];
  loaded: boolean;
  fetchCommunities: () => Promise<void>;
  createCommunity: (name: string, isPublic: boolean) => Promise<Community>;
  joinCommunity: (communityId: number) => Promise<Community>;
  leaveCommunity: (communityId: number) => Promise<void>;
  acceptInvite: (code: string) => Promise<Community>;
  updateCommunity: (
    communityId: number,
    changes: Partial<
      Pick<Community, "name" | "isPublic" | "description" | "links" | CommunityConnectionSetting>
    >,
  ) => Promise<Community>;
  setCommunityImage: (
    communityId: number,
    image: CommunityImage,
    file: File | null,
  ) => Promise<Community>;
  deleteCommunity: (communityId: number) => Promise<void>;
  updateLayout: (layout: RailItem[]) => Promise<void>;
  setLive: (communityId: number, live: boolean) => void;
};

function withJoined(state: CommunityState, community: Community) {
  return state.communities.some(({ id }) => id === community.id)
    ? state
    : {
        communities: [...state.communities, { ...community, role: community.role ?? "member" }],
        layout: [...state.layout, { type: "community" as const, communityId: community.id }],
      };
}

export const useCommunityStore = create<CommunityState>()((set, get) => ({
  setLive: (communityId, live) =>
    set((state) => ({
      communities: state.communities.map((community) =>
        community.id === communityId ? { ...community, live } : community,
      ),
    })),
  communities: [],
  loaded: false,
  layout: [],
  fetchCommunities: async () => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ communities: [], layout: [], loaded: false });
      return;
    }

    const [communities, layout] = await Promise.all([
      api.getCommunities(token).catch(() => null),
      api.getRailLayout(token).catch(() => null),
    ]);
    if (communities) set({ communities, loaded: true });
    if (layout) set({ layout });
  },
  createCommunity: async (name, isPublic) => {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    const community = await api.createCommunity(token, name, isPublic);
    set((state) => ({
      communities: [...state.communities, { ...community, role: "owner" }],
      layout: [...state.layout, { type: "community", communityId: community.id }],
    }));
    return community;
  },
  joinCommunity: async (communityId) => {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    const community = await api.joinCommunity(token, communityId);
    set((state) => withJoined(state, community));
    return community;
  },
  leaveCommunity: async (communityId) => {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    await api.leaveCommunity(token, communityId);
    set((state) => ({
      communities: state.communities.filter(({ id }) => id !== communityId),
      layout: state.layout.flatMap((item): RailItem[] => {
        if (item.type === "community") return item.communityId === communityId ? [] : [item];
        const communityIds = item.communityIds.filter((id) => id !== communityId);
        return communityIds.length > 0 ? [{ ...item, communityIds }] : [];
      }),
    }));
    window.dispatchEvent(new CustomEvent(COMMUNITY_LEFT_EVENT, { detail: communityId }));
  },
  acceptInvite: async (code) => {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    const community = await api.acceptInvite(token, code);
    set((state) => withJoined(state, community));
    return community;
  },
  updateCommunity: async (communityId, changes) => {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    const updated = await api.updateCommunity(token, communityId, changes);
    set((state) => ({
      communities: state.communities.map((community) =>
        community.id === communityId
          ? {
              ...community,
              name: updated.name,
              description: updated.description,
              isPublic: updated.isPublic,
              showTwitchLive: updated.showTwitchLive,
              showTwitchClips: updated.showTwitchClips,
              showDiscordOnline: updated.showDiscordOnline,
              showDiscordInvite: updated.showDiscordInvite,
            }
          : community,
      ),
    }));
    return updated;
  },
  setCommunityImage: async (communityId, image, file) => {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    const updated = file
      ? await api.uploadCommunityImage(token, communityId, image, file)
      : await api.removeCommunityImage(token, communityId, image);
    set((state) => ({
      communities: state.communities.map((community) =>
        community.id === communityId
          ? {
              ...community,
              iconUrl: updated.iconUrl,
              coverUrl: updated.coverUrl,
              backgroundUrl: updated.backgroundUrl,
            }
          : community,
      ),
    }));
    return updated;
  },
  deleteCommunity: async (communityId) => {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    await api.deleteCommunity(token, communityId);
    set((state) => ({
      communities: state.communities.filter(({ id }) => id !== communityId),
      layout: state.layout.flatMap((item): RailItem[] =>
        item.type === "community"
          ? item.communityId === communityId
            ? []
            : [item]
          : [{ ...item, communityIds: item.communityIds.filter((id) => id !== communityId) }],
      ),
    }));
  },
  updateLayout: async (layout) => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    set({ layout });
    try {
      const saved = await api.updateRailLayout(token, layout);
      if (get().layout === layout) set({ layout: saved });
    } catch {
      await get().fetchCommunities();
    }
  },
}));

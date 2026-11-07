import { create } from "zustand";
import * as api from "@/lib/api";
import type {
  Community,
  CommunityConnectionSetting,
  CommunityImage,
  RailItem,
} from "@/lib/api";
import { withoutCommunity } from "@/lib/rail-layout";
import { requireToken, useAuthStore } from "./auth-store";

export const COMMUNITY_LEFT_EVENT = "orbis:community-left";
export const COMMUNITY_REMOVED_EVENT = "orbis:community-removed";
export const COMMUNITY_MEMBERS_CHANGED_EVENT = "orbis:community-members-changed";

type CommunityState = {
  communities: Community[];
  layout: RailItem[];
  loaded: boolean;
  failed: boolean;
  fetchCommunities: () => Promise<void>;
  createCommunity: (name: string, isPublic: boolean) => Promise<Community>;
  joinCommunity: (communityId: number) => Promise<Community>;
  leaveCommunity: (communityId: number) => Promise<void>;
  forgetCommunity: (communityId: number, removed?: boolean) => void;
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
  setVerified: (communityId: number, isVerified: boolean) => void;
};

function withJoined(state: CommunityState, community: Community) {
  return state.communities.some(({ id }) => id === community.id)
    ? state
    : {
        communities: [...state.communities, { ...community, role: community.role ?? "member" }],
        layout: [...state.layout, { type: "community" as const, communityId: community.id }],
      };
}

function patched(state: CommunityState, communityId: number, patch: Partial<Community>) {
  return {
    communities: state.communities.map((community) =>
      community.id === communityId ? { ...community, ...patch } : community,
    ),
  };
}

export const useCommunityStore = create<CommunityState>()((set, get) => ({
  setLive: (communityId, live) => set((state) => patched(state, communityId, { live })),
  setVerified: (communityId, isVerified) =>
    set((state) => patched(state, communityId, { isVerified })),
  communities: [],
  loaded: false,
  failed: false,
  layout: [],
  fetchCommunities: async () => {
    const { token } = useAuthStore.getState();
    if (!token) {
      set({ communities: [], layout: [], loaded: false, failed: false });
      return;
    }

    const [communities, layout] = await Promise.all([
      api.getCommunities(token).catch(() => null),
      api.getRailLayout(token).catch(() => null),
    ]);
    set(communities ? { communities, loaded: true, failed: false } : { failed: true });
    if (layout) set({ layout });
  },
  createCommunity: async (name, isPublic) => {
    const community = await api.createCommunity(requireToken(), name, isPublic);
    set((state) => ({
      communities: [...state.communities, { ...community, role: "owner" }],
      layout: [...state.layout, { type: "community", communityId: community.id }],
    }));
    return community;
  },
  joinCommunity: async (communityId) => {
    const community = await api.joinCommunity(requireToken(), communityId);
    set((state) => withJoined(state, community));
    return community;
  },
  leaveCommunity: async (communityId) => {
    await api.leaveCommunity(requireToken(), communityId);
    get().forgetCommunity(communityId);
  },
  forgetCommunity: (communityId, removed = false) => {
    set((state) => ({
      communities: state.communities.filter(({ id }) => id !== communityId),
      layout: state.layout.flatMap((item): RailItem[] => {
        if (item.type === "community") return item.communityId === communityId ? [] : [item];
        const communityIds = item.communityIds.filter((id) => id !== communityId);
        return communityIds.length > 0 ? [{ ...item, communityIds }] : [];
      }),
    }));
    window.dispatchEvent(
      new CustomEvent(removed ? COMMUNITY_REMOVED_EVENT : COMMUNITY_LEFT_EVENT, {
        detail: communityId,
      }),
    );
  },
  acceptInvite: async (code) => {
    const community = await api.acceptInvite(requireToken(), code);
    set((state) => withJoined(state, community));
    return community;
  },
  updateCommunity: async (communityId, changes) => {
    const updated = await api.updateCommunity(requireToken(), communityId, changes);
    set((state) =>
      patched(state, communityId, {
        name: updated.name,
        description: updated.description,
        isPublic: updated.isPublic,
        showTwitchLive: updated.showTwitchLive,
        showTwitchClips: updated.showTwitchClips,
        showDiscordOnline: updated.showDiscordOnline,
        showDiscordInvite: updated.showDiscordInvite,
      }),
    );
    return updated;
  },
  setCommunityImage: async (communityId, image, file) => {
    const token = requireToken();
    const updated = file
      ? await api.uploadCommunityImage(token, communityId, image, file)
      : await api.removeCommunityImage(token, communityId, image);
    set((state) =>
      patched(state, communityId, {
        iconUrl: updated.iconUrl,
        coverUrl: updated.coverUrl,
        backgroundUrl: updated.backgroundUrl,
      }),
    );
    return updated;
  },
  deleteCommunity: async (communityId) => {
    await api.deleteCommunity(requireToken(), communityId);
    set((state) => ({
      communities: state.communities.filter(({ id }) => id !== communityId),
      layout: withoutCommunity(state.layout, communityId),
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

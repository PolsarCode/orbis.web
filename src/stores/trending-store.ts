import { create } from "zustand";
import { getTrendingTags, type TagWindow, type TrendingTag } from "@/lib/api";
import { useAuthStore } from "./auth-store";

type TrendingState = {
  tags: TrendingTag[];
  window: TagWindow;
  fetchedAt: number;
  fetchTrending: () => Promise<void>;
};

let trendingRequest: Promise<void> | null = null;

export const useTrendingStore = create<TrendingState>()((set) => ({
  tags: [],
  window: "day",
  fetchedAt: 0,
  fetchTrending: () => {
    const { token } = useAuthStore.getState();
    if (!token) return Promise.resolve();

    trendingRequest ??= getTrendingTags(token)
      .then(({ window, tags }) => set({ window, tags, fetchedAt: Date.now() }))
      .catch(() => undefined)
      .finally(() => {
        trendingRequest = null;
      });
    return trendingRequest;
  },
}));

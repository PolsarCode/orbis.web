import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FeedContentType } from "@/lib/api";

export const feedContentTypes: FeedContentType[] = [
  "post",
  "activity",
];

export type FeedViewMode = "card" | "compact";

export function shownTypes(types: FeedContentType[], excluded: FeedContentType[]) {
  const shown = types.filter((type) => !excluded.includes(type));
  return shown.length > 0 ? shown : types;
}

type FeedPreferences = {
  view: FeedViewMode;
  setView: (view: FeedViewMode) => void;
  excludedTypes: FeedContentType[];
  setShown: (types: FeedContentType[], shown: FeedContentType[]) => void;
  showAll: () => void;
};

export const useFeedPreferencesStore = create<FeedPreferences>()(
  persist(
    (set) => ({
      view: "card",
      setView: (view) => set({ view }),
      excludedTypes: [],
      setShown: (types, shown) =>
        set((state) => ({
          excludedTypes: feedContentTypes.filter((type) =>
            types.includes(type) ? !shown.includes(type) : state.excludedTypes.includes(type),
          ),
        })),
      showAll: () => set({ excludedTypes: [] }),
    }),
    {
      name: "feed-preferences",
      skipHydration: true,
      partialize: ({ excludedTypes, view }) => ({ excludedTypes, view }),
      merge: (saved, current) => {
        const value =
          saved && typeof saved === "object"
            ? (saved as Partial<FeedPreferences>).excludedTypes
            : undefined;
        const view =
          saved && typeof saved === "object"
            ? (saved as Partial<FeedPreferences>).view
            : undefined;
        return {
          ...current,
          view: view === "card" || view === "compact" ? view : current.view,
          excludedTypes: Array.isArray(value)
            ? feedContentTypes.filter((type) => value.includes(type))
            : current.excludedTypes,
        };
      },
    },
  ),
);

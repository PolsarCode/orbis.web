import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MediaListName } from "@/lib/api";

const lists: MediaListName[] = ["trending", "season", "top", "upcoming"];

type MediaShelfPreferences = {
  list: MediaListName;
  setList: (list: MediaListName) => void;
};

export const useMediaShelfStore = create<MediaShelfPreferences>()(
  persist(
    (set) => ({
      list: "trending",
      setList: (list) => set({ list }),
    }),
    {
      name: "media-shelf-preferences",
      skipHydration: true,
      partialize: ({ list }) => ({ list }),
      merge: (saved, current) => {
        if (!saved || typeof saved !== "object") return current;
        const values = saved as Partial<MediaShelfPreferences>;
        return {
          ...current,
          list: values.list && lists.includes(values.list) ? values.list : current.list,
        };
      },
    },
  ),
);

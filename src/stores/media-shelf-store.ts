import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MediaListName, MediaType } from "@/lib/api";

const types: MediaType[] = ["anime", "manga", "game"];
const lists: MediaListName[] = ["trending", "season", "top", "upcoming"];

type MediaShelfPreferences = {
  type: MediaType;
  list: MediaListName;
  setType: (type: MediaType) => void;
  setList: (list: MediaListName) => void;
};

export const useMediaShelfStore = create<MediaShelfPreferences>()(
  persist(
    (set) => ({
      type: "anime",
      list: "trending",
      setType: (type) => set({ type }),
      setList: (list) => set({ list }),
    }),
    {
      name: "media-shelf-preferences",
      skipHydration: true,
      partialize: ({ type, list }) => ({ type, list }),
      merge: (saved, current) => {
        if (!saved || typeof saved !== "object") return current;
        const values = saved as Partial<MediaShelfPreferences>;
        return {
          ...current,
          type: values.type && types.includes(values.type) ? values.type : current.type,
          list: values.list && lists.includes(values.list) ? values.list : current.list,
        };
      },
    },
  ),
);

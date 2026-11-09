import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LibraryStatus, MediaType } from "@/lib/api";
import { libraryStatuses } from "@/lib/library";

export type LibraryViewMode = "cards" | "list";
export type LibraryTypeFilter = "all" | MediaType;
export type LibraryStatusFilter = "all" | LibraryStatus;
export type LibraryPage = "discover" | "mine" | "charts";

const pages: LibraryPage[] = ["discover", "mine", "charts"];
const mediaTypes: MediaType[] = ["anime", "manga", "game"];

type LibraryPreferences = {
  type: LibraryTypeFilter;
  status: LibraryStatusFilter;
  view: LibraryViewMode;
  page: LibraryPage;
  mediaType: MediaType;
  setType: (type: LibraryTypeFilter) => void;
  setStatus: (status: LibraryStatusFilter) => void;
  setView: (view: LibraryViewMode) => void;
  setPage: (page: LibraryPage, mediaType: MediaType) => void;
};

export const useLibraryPreferencesStore = create<LibraryPreferences>()(
  persist(
    (set) => ({
      type: "all",
      status: "current",
      view: "list",
      page: "discover",
      mediaType: "anime",
      setType: (type) => set({ type }),
      setStatus: (status) => set({ status }),
      setView: (view) => set({ view }),
      setPage: (page, mediaType) => set({ page, mediaType }),
    }),
    {
      name: "library-preferences",
      partialize: ({ type, status, view, page, mediaType }) => ({
        type,
        status,
        view,
        page,
        mediaType,
      }),
      skipHydration: true,
      merge: (saved, current) => {
        if (!saved || typeof saved !== "object") return current;
        const values = saved as Partial<LibraryPreferences>;
        return {
          ...current,
          type: values.type && ["all", "anime", "manga", "game"].includes(values.type)
            ? values.type : current.type,
          status: values.status && ["all", ...libraryStatuses].includes(values.status)
            ? values.status : current.status,
          view: values.view === "cards" || values.view === "list"
            ? values.view : current.view,
          page: values.page && pages.includes(values.page) ? values.page : current.page,
          mediaType: values.mediaType && mediaTypes.includes(values.mediaType)
            ? values.mediaType : current.mediaType,
        };
      },
    },
  ),
);

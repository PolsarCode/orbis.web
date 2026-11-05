import type { ReactNode } from "react";
import { create } from "zustand";
import type { FeedEntry, LibraryEntry } from "@/lib/api";

export const searchSources = ["posts", "tags", "titles", "people", "communities", "library", "tickets"] as const;

export type SearchSource = (typeof searchSources)[number];
export type SearchFilter = "all" | "page" | SearchSource;

export type SearchPageSection = {
  label: string;
  render: (query: string, actions: { openItem: (item: FeedEntry) => void }) => ReactNode;
};

export type SearchScope = {
  lead?: SearchSource;
  section?: SearchPageSection;
  onAdded?: (entry: LibraryEntry) => void;
};

type SearchState = {
  open: boolean;
  query: string;
  filter: SearchFilter;
  scopes: { id: string; scope: SearchScope }[];
  libraryChanges: number;
  openSearch: (options?: { query?: string; filter?: SearchFilter }) => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilter) => void;
  setScope: (id: string, scope: SearchScope | null) => void;
  libraryChanged: () => void;
};

export const useSearchStore = create<SearchState>()((set) => ({
  open: false,
  query: "",
  filter: "all",
  scopes: [],
  libraryChanges: 0,
  openSearch: ({ query = "", filter = "all" } = {}) => set({ open: true, query, filter }),
  closeSearch: () => set({ open: false }),
  setQuery: (query) => set({ query }),
  setFilter: (filter) => set({ filter }),
  setScope: (id, scope) =>
    set((state) => {
      if (!scope) return { scopes: state.scopes.filter((entry) => entry.id !== id) };
      const index = state.scopes.findIndex((entry) => entry.id === id);
      if (index === -1) return { scopes: [...state.scopes, { id, scope }] };
      return { scopes: state.scopes.map((entry, i) => (i === index ? { id, scope } : entry)) };
    }),
  libraryChanged: () => set((state) => ({ libraryChanges: state.libraryChanges + 1 })),
}));

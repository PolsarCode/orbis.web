import type { RailFolder, RailItem } from "@/lib/api";

export type RailDrop = "combine" | "before" | "after";

export const RAIL_END_KEY = "rail-end";

export const communityKey = (id: number) => `c:${id}`;
export const folderKey = (id: number) => `f:${id}`;

function parseKey(key: string) {
  const [kind, id] = key.split(":");
  return { kind: kind === "f" ? "folder" : "community", id: Number(id) } as const;
}

export function normalizeLayout(layout: RailItem[], communityIds: number[]): RailItem[] {
  const known = new Set(communityIds);
  const placed = new Set<number>();
  const take = (id: number) => {
    if (!known.has(id) || placed.has(id)) return false;
    placed.add(id);
    return true;
  };

  const items = layout.flatMap((item): RailItem[] => {
    if (item.type === "community") return take(item.communityId) ? [item] : [];

    const ids = item.communityIds.filter(take);
    if (ids.length === 0) return [];
    if (ids.length === 1) return [{ type: "community", communityId: ids[0] }];
    return [{ ...item, communityIds: ids }];
  });

  return [
    ...items,
    ...communityIds
      .filter((id) => !placed.has(id))
      .map((communityId) => ({ type: "community", communityId }) as const),
  ];
}

export function folderOf(layout: RailItem[], communityId: number) {
  return layout.find(
    (item): item is RailFolder =>
      item.type === "folder" && item.communityIds.includes(communityId),
  );
}

export function withoutCommunity(layout: RailItem[], communityId: number): RailItem[] {
  return layout.flatMap((item): RailItem[] =>
    item.type === "community"
      ? item.communityId === communityId
        ? []
        : [item]
      : [{ ...item, communityIds: item.communityIds.filter((id) => id !== communityId) }],
  );
}

function insertAt<T>(list: T[], index: number, value: T) {
  return [...list.slice(0, index), value, ...list.slice(index)];
}

export function moveInLayout(
  layout: RailItem[],
  activeKey: string,
  overKey: string,
  drop: RailDrop,
  openFolders: Set<number>,
  newFolderId: number,
): RailItem[] {
  if (overKey === RAIL_END_KEY) {
    const active = parseKey(activeKey);
    if (active.kind === "folder") {
      const moving = layout.find((item) => item.type === "folder" && item.id === active.id);
      return moving ? [...layout.filter((item) => item !== moving), moving] : layout;
    }

    const rest = withoutCommunity(layout, active.id);
    return [...rest, { type: "community", communityId: active.id }];
  }

  const active = parseKey(activeKey);
  const over = parseKey(overKey);
  if (activeKey === overKey) return layout;

  if (active.kind === "folder") {
    const moving = layout.find((item) => item.type === "folder" && item.id === active.id);
    if (!moving) return layout;

    const rest = layout.filter((item) => item !== moving);
    const target =
      over.kind === "folder"
        ? rest.findIndex((item) => item.type === "folder" && item.id === over.id)
        : rest.findIndex((item) =>
            item.type === "community"
              ? item.communityId === over.id
              : item.communityIds.includes(over.id),
          );
    if (target === -1) return layout;
    return insertAt(rest, drop === "before" ? target : target + 1, moving);
  }

  const rest = withoutCommunity(layout, active.id);

  if (over.kind === "folder") {
    const index = rest.findIndex((item) => item.type === "folder" && item.id === over.id);
    if (index === -1) return layout;
    const folder = rest[index] as RailFolder;

    if (drop === "combine" || (drop === "after" && openFolders.has(folder.id))) {
      const communityIds =
        drop === "combine"
          ? [...folder.communityIds, active.id]
          : [active.id, ...folder.communityIds];
      return rest.map((item) => (item === folder ? { ...folder, communityIds } : item));
    }
    return insertAt(rest, drop === "before" ? index : index + 1, {
      type: "community",
      communityId: active.id,
    });
  }

  const parent = folderOf(rest, over.id);
  if (parent) {
    const at = parent.communityIds.indexOf(over.id);
    const communityIds = insertAt(
      parent.communityIds,
      drop === "before" ? at : at + 1,
      active.id,
    );
    return rest.map((item) => (item === parent ? { ...parent, communityIds } : item));
  }

  const index = rest.findIndex(
    (item) => item.type === "community" && item.communityId === over.id,
  );
  if (index === -1) return layout;

  if (drop === "combine") {
    const folder: RailFolder = {
      type: "folder",
      id: newFolderId,
      name: null,
      color: null,
      communityIds: [over.id, active.id],
    };
    return rest.map((item, i) => (i === index ? folder : item));
  }
  return insertAt(rest, drop === "before" ? index : index + 1, {
    type: "community",
    communityId: active.id,
  });
}

export const FOLDER_COLORS = [
  { value: "#5b8def", label: "Blue" },
  { value: "#4caf7a", label: "Green" },
  { value: "#e3b341", label: "Yellow" },
  { value: "#f08a4b", label: "Orange" },
  { value: "#e5534b", label: "Red" },
  { value: "#e57bb5", label: "Pink" },
  { value: "#9a7cf0", label: "Purple" },
] as const;

export function ungroup(layout: RailItem[], folderId: number): RailItem[] {
  return layout.flatMap((item): RailItem[] =>
    item.type === "folder" && item.id === folderId
      ? item.communityIds.map((communityId) => ({ type: "community", communityId }) as const)
      : [item],
  );
}

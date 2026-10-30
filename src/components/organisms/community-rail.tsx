"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Compass,
  Folder,
  House,
  LibraryBig,
  LogOut,
  Plus,
  Settings,
  UserCog,
} from "lucide-react";
import { Dropdown, Tooltip, type MenuProps } from "antd";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import * as Atom from "@atom";
import { canManage, type Community, type RailFolder, type RailItem } from "@/lib/api";
import { newAccountMessage, useNewAccountWait } from "@/lib/new-account";
import { useReadOnly } from "@/lib/read-only";
import { useIsPhone } from "@/lib/use-is-phone";
import {
  communityKey,
  folderKey,
  moveInLayout,
  normalizeLayout,
  RAIL_END_KEY,
  ungroup,
  type RailDrop,
} from "@/lib/rail-layout";
import { useCommunityStore } from "@/stores/community-store";
import { useFriendsStore } from "@/stores/friends-store";
import { useLayoutStore } from "@/stores/layout-store";
import { CreateCommunityModal } from "./create-community-modal";
import { FolderSettingsModal } from "./folder-settings-modal";
import { useLeaveCommunity } from "./leave-community-button";

function itemClass(active: boolean) {
  return `focus-ring relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full font-display text-[23px] leading-none font-bold transition-colors motion-reduce:transition-none ${
    active
      ? "bg-accent text-accent-foreground"
      : "bg-rail-item text-foreground hover:bg-accent-soft"
  }`;
}

function RailSlot({
  label,
  dragging = false,
  slotRef,
  style,
  railKey,
  indicator,
  children,
}: {
  label: string;
  dragging?: boolean;
  slotRef?: (element: HTMLElement | null) => void;
  style?: CSSProperties;
  railKey?: string;
  indicator?: "before" | "after";
  children: ReactNode;
}) {
  return (
    <li
      ref={slotRef}
      style={style}
      data-rail-key={railKey}
      className={`relative flex w-full justify-center ${dragging ? "z-10" : ""}`}
    >
      {indicator && (
        <span
          aria-hidden
          className={`absolute left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-accent ${
            indicator === "before" ? "-top-2.5" : "-bottom-2.5"
          }`}
        />
      )}
      <Tooltip
        title={label}
        placement="right"
        open={dragging ? false : undefined}
      >
        {children}
      </Tooltip>
    </li>
  );
}

const FADE = "24px";

function fadeMask({ above, below }: { above: boolean; below: boolean }) {
  if (!above && !below) return undefined;

  const mask = `linear-gradient(to bottom, ${above ? "transparent" : "#000"}, #000 ${FADE}, #000 calc(100% - ${FADE}), ${below ? "transparent" : "#000"})`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

const OPEN_FOLDERS_KEY = "orbis:rail-open-folders";
const noShift = () => null;
const railCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length ? pointerCollisions : closestCenter(args);
};

function readOpenFolders() {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(OPEN_FOLDERS_KEY) ?? "[]");
    return new Set(Array.isArray(saved) ? saved.filter(Number.isInteger) : []);
  } catch {
    return new Set<number>();
  }
}

function tint(color: string | null, alpha: string) {
  return color ? { backgroundColor: `${color}${alpha}` } : undefined;
}

function SortableCommunity({
  community,
  active,
  drop,
}: {
  community: Community;
  active: boolean;
  drop?: RailDrop;
}) {
  const target = drop === "combine";
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: communityKey(community.id) });
  const router = useRouter();
  const pathname = usePathname();
  const readOnly = useReadOnly();
  const confirmLeave = useLeaveCommunity();
  const base = `/communities/${community.id}`;

  function leave() {
    confirmLeave(community, () => {
      if (pathname.startsWith(`${base}/me`) || pathname.startsWith(`${base}/settings`)) {
        router.push(community.isPublic ? base : "/");
      }
    });
  }

  const items: MenuProps["items"] = [
    {
      key: "me",
      label: "Your settings",
      icon: <UserCog size={14} />,
      onClick: () => router.push(`${base}/me`),
    },
    ...(canManage(community)
      ? [
          {
            key: "settings",
            label: "Community settings",
            icon: <Settings size={14} />,
            onClick: () => router.push(`${base}/settings`),
          },
        ]
      : []),
    { type: "divider" },
    {
      key: "leave",
      label: "Leave community",
      icon: <LogOut size={14} />,
      danger: true,
      disabled: readOnly,
      onClick: leave,
    },
  ];

  return (
    <RailSlot
      label={community.name}
      dragging={isDragging}
      slotRef={setNodeRef}
      railKey={communityKey(community.id)}
      indicator={drop === "combine" ? undefined : drop}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <Dropdown trigger={["contextMenu"]} menu={{ items }}>
        <Link
          {...attributes}
          {...listeners}
          role={undefined}
          href={`/communities/${community.id}`}
          aria-label={community.live ? `${community.name}, live` : community.name}
          aria-current={active ? "page" : undefined}
          className={`${itemClass(active)} ${
            active || target
              ? "ring-2 ring-accent ring-offset-2 ring-offset-rail"
              : community.live
                ? "ring-2 ring-danger ring-offset-2 ring-offset-rail"
                : ""
          } ${target ? "scale-110" : ""} ${
            isDragging
              ? "cursor-grabbing border-2 border-dashed border-accent opacity-50"
              : ""
          }`}
        >
          <Atom.CommunityIcon name={community.name} src={community.iconUrl} />
          {community.live && <Atom.LiveTag />}
        </Link>
      </Dropdown>
    </RailSlot>
  );
}

function SortableFolder({
  folder,
  communities,
  open,
  active,
  drop,
  onToggle,
  onEdit,
  onUngroup,
}: {
  folder: RailFolder;
  communities: Community[];
  open: boolean;
  active: boolean;
  drop?: RailDrop;
  onToggle: () => void;
  onEdit: () => void;
  onUngroup: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folderKey(folder.id) });
  const label = folder.name || communities.map(({ name }) => name).join(", ");
  const target = drop === "combine";

  return (
    <RailSlot
      label={label}
      dragging={isDragging}
      slotRef={setNodeRef}
      railKey={folderKey(folder.id)}
      indicator={drop === "combine" ? undefined : drop}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <Dropdown
        trigger={["contextMenu"]}
        menu={{
          items: [
            { key: "edit", label: "Folder settings", onClick: onEdit },
            { key: "ungroup", label: "Ungroup folder", onClick: onUngroup },
          ],
        }}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${folder.name || "Folder"}, ${communities.length} communities`}
          aria-expanded={open}
          onClick={onToggle}
          style={open ? undefined : tint(folder.color, "40")}
          className={`focus-ring relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl transition-[background-color,transform] motion-reduce:transition-none ${
            open ? "" : folder.color ? "" : "bg-rail-item"
          } ${
            active && !open ? "ring-2 ring-accent ring-offset-2 ring-offset-rail" : ""
          } ${target ? "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-rail" : ""} ${
            isDragging ? "cursor-grabbing opacity-50" : ""
          }`}
        >
          {open ? (
            <Folder
              size={20}
              aria-hidden
              style={{ color: folder.color ?? undefined }}
              fill={folder.color ?? "currentColor"}
              fillOpacity={0.35}
            />
          ) : (
            <span className="grid grid-cols-[repeat(2,18px)] grid-rows-[repeat(2,18px)] gap-1">
              {communities.slice(0, 4).map((community) => (
                <span
                  key={community.id}
                  className="relative flex h-[18px] w-[18px] items-center justify-center rounded-full bg-surface font-display text-[9px] leading-none font-bold text-foreground"
                >
                  <Atom.CommunityIcon name={community.name} src={community.iconUrl} />
                </span>
              ))}
            </span>
          )}
        </button>
      </Dropdown>
    </RailSlot>
  );
}

function RailEndDrop({ highlighted }: { highlighted: boolean }) {
  const { setNodeRef } = useDroppable({ id: RAIL_END_KEY });

  return (
    <li
      ref={setNodeRef}
      data-rail-key={RAIL_END_KEY}
      aria-hidden
      className={`-my-4 min-h-4 flex-1 rounded-lg transition-colors ${
        highlighted ? "bg-accent/15 ring-1 ring-inset ring-accent/50" : ""
      }`}
    />
  );
}

export function CommunityRail() {
  const { communityId } = useParams<{ communityId?: string }>();
  const pathname = usePathname();
  const inLibrary = pathname === "/library" || pathname.startsWith("/library/");
  const communities = useCommunityStore((state) => state.communities);
  const layout = useCommunityStore((state) => state.layout);
  const fetchCommunities = useCommunityStore((state) => state.fetchCommunities);
  const updateLayout = useCommunityStore((state) => state.updateLayout);
  const [creating, setCreating] = useState(false);
  const readOnly = useReadOnly();
  const newAccountWait = useNewAccountWait();
  const createBlocked = readOnly || newAccountWait !== null;
  const [openFolders, setOpenFolders] = useState(readOpenFolders);
  const [closingFolders, setClosingFolders] = useState<Set<number>>(new Set());
  const [openingFolders, setOpeningFolders] = useState<Set<number>>(new Set());
  const closeTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const openTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ overKey: string; drop: RailDrop } | null>(null);
  const [editing, setEditing] = useState<RailFolder | null>(null);
  const suppressClick = useRef(false);
  const scrollList = useRef<HTMLUListElement>(null);
  const [overflow, setOverflow] = useState({ above: false, below: false });
  const railOpen = useLayoutStore((state) => state.railOpen);
  const setRailOpen = useLayoutStore((state) => state.setRailOpen);
  const isPhone = useIsPhone();
  const hidden = isPhone && !railOpen;

  useEffect(() => {
    if (!railOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRailOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [railOpen, setRailOpen]);

  function measureOverflow() {
    const list = scrollList.current;
    if (!list) return;

    const above = list.scrollTop > 0;
    const below = list.scrollTop + list.clientHeight < list.scrollHeight - 1;
    setOverflow((current) =>
      current.above === above && current.below === below
        ? current
        : { above, below },
    );
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter"],
      },
    }),
  );
  const ids = useMemo(() => communities.map(({ id }) => id), [communities]);
  const byId = useMemo(
    () => new Map(communities.map((community) => [community.id, community])),
    [communities],
  );
  const items = useMemo(() => normalizeLayout(layout, ids), [layout, ids]);
  const isOpen = (folder: RailFolder) =>
    openFolders.has(folder.id) && !dragging?.startsWith("f:");
  const visible = items.flatMap((item) =>
    item.type === "community"
      ? [communityKey(item.communityId)]
      : [
          folderKey(item.id),
          ...(isOpen(item) ? item.communityIds.map(communityKey) : []),
        ],
  );
  const activeId = Number(communityId);
  const draggedCommunity = dragging?.startsWith("c:")
    ? byId.get(Number(dragging.slice(2)))
    : undefined;
  const nextKey = new Map<string, string>();
  const previousKey = new Map<string, string>();
  const folderOfMember = new Map<string, number>();
  const keyOf = (item: RailItem) =>
    item.type === "community" ? communityKey(item.communityId) : folderKey(item.id);
  items.forEach((item, index) => {
    const key = keyOf(item);
    const following = items[index + 1];
    if (following) {
      nextKey.set(key, keyOf(following));
      previousKey.set(keyOf(following), key);
    }
    if (item.type !== "folder" || !isOpen(item)) return;

    const members = item.communityIds.map(communityKey);
    if (members.length > 0) nextKey.set(key, members[0]);
    members.forEach((member, position) => {
      folderOfMember.set(member, item.id);
      if (position > 0) {
        nextKey.set(members[position - 1], member);
        previousKey.set(member, members[position - 1]);
      }
    });
  });
  const lastKey = items.length > 0 ? keyOf(items[items.length - 1]) : null;

  function settleDrop(
    activeKey: string,
    target: { overKey: string; drop: RailDrop },
    side: "before" | "after",
  ) {
    let { overKey, drop } = target;

    if (drop === "combine") {
      const insideFolder = folderOfMember.has(overKey);
      const ownFolder =
        overKey.startsWith("f:") && folderOfMember.get(activeKey) === Number(overKey.slice(2));
      if (insideFolder || ownFolder) drop = side;
    }

    if (drop === "after") {
      const following = nextKey.get(overKey);
      if (following) {
        overKey = following;
        drop = "before";
      } else if (overKey === lastKey) {
        overKey = RAIL_END_KEY;
      }
    }

    if (overKey === RAIL_END_KEY) {
      return activeKey === lastKey ? null : { overKey, drop: "after" as const };
    }
    if (overKey === activeKey) return null;
    if (drop === "before" && previousKey.get(overKey) === activeKey) return null;
    return { overKey, drop };
  }

  useEffect(() => {
    const closing = closeTimers.current;
    const opening = openTimers.current;
    return () => {
      closing.forEach(clearTimeout);
      opening.forEach(clearTimeout);
    };
  }, []);

  function setFolderOpen(folderId: number, open: boolean) {
    setOpenFolders((current) => {
      const next = new Set(current);
      if (open) next.add(folderId);
      else next.delete(folderId);
      try {
        localStorage.setItem(OPEN_FOLDERS_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  function setFolderClosing(folderId: number, closing: boolean) {
    setClosingFolders((current) => {
      const next = new Set(current);
      if (closing) next.add(folderId);
      else next.delete(folderId);
      return next;
    });
  }

  function toggleFolder(folderId: number) {
    const timer = closeTimers.current.get(folderId);
    if (timer) {
      clearTimeout(timer);
      closeTimers.current.delete(folderId);
      setFolderClosing(folderId, false);
      return;
    }
    if (!openFolders.has(folderId)) {
      setOpeningFolders((current) => new Set(current).add(folderId));
      setFolderOpen(folderId, true);
      clearTimeout(openTimers.current.get(folderId));
      openTimers.current.set(
        folderId,
        setTimeout(() => {
          openTimers.current.delete(folderId);
          setOpeningFolders((current) => {
            const next = new Set(current);
            next.delete(folderId);
            return next;
          });
        }, 250),
      );
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFolderOpen(folderId, false);
      return;
    }

    setFolderClosing(folderId, true);
    closeTimers.current.set(
      folderId,
      setTimeout(() => {
        closeTimers.current.delete(folderId);
        setFolderClosing(folderId, false);
        setFolderOpen(folderId, false);
      }, 200),
    );
  }

  function saveLayout(next: typeof items) {
    updateLayout(normalizeLayout(next, ids));
  }

  function finishDrag() {
    setDragging(null);
    setDrop(null);
    setTimeout(() => {
      suppressClick.current = false;
    });
  }

  function trackDrop({ active, over, activatorEvent, delta }: DragMoveEvent) {
    const activeKey = String(active.id);
    const overKey = over ? String(over.id) : null;
    const node =
      overKey && overKey !== activeKey
        ? document.querySelector(`[data-rail-key="${overKey}"]`)
        : null;
    let next: typeof drop = null;

    if (overKey === RAIL_END_KEY && node) {
      next = settleDrop(activeKey, { overKey, drop: "after" }, "after");
    } else if (overKey && node) {
      const rect = node.getBoundingClientRect();
      const center = rect.top + rect.height / 2;

      if (activatorEvent instanceof PointerEvent) {
        const pointer = activatorEvent.clientY + delta.y;
        const side = pointer < center ? "before" : "after";
        next = settleDrop(
          activeKey,
          {
            overKey,
            drop:
              activeKey.startsWith("c:") && Math.abs(pointer - center) < rect.height * 0.3
                ? "combine"
                : side,
          },
          side,
        );
      } else {
        const side = visible.indexOf(activeKey) < visible.indexOf(overKey) ? "after" : "before";
        next = settleDrop(activeKey, { overKey, drop: side }, side);
      }
    }

    setDrop((current) =>
      current?.overKey === next?.overKey && current?.drop === next?.drop ? current : next,
    );
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const target = drop;
    const open = new Set(items.flatMap((item) => (item.type === "folder" && isOpen(item) ? [item.id] : [])));
    finishDrag();
    if (!over || !target) return;
    saveLayout(
      moveInLayout(items, String(active.id), target.overKey, target.drop, open, -Date.now()),
    );
  }

  useEffect(() => {
    const list = scrollList.current;
    if (!list) return;

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(list);
    Array.from(list.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [visible.length]);

  useEffect(() => {
    fetchCommunities();
    useFriendsStore.getState().connect();
  }, [fetchCommunities]);

  return (
    <nav
      aria-label="Communities"
      inert={hidden}
      className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-20 shrink-0 flex-col items-center gap-4 bg-rail px-4 py-5 transition-transform duration-300 ease-out motion-reduce:transition-none sm:static sm:z-auto sm:h-full sm:translate-x-0 ${
        railOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) setRailOpen(false);
      }}
    >
      <Link
        href="/"
        aria-label="Orbis home"
        className="group focus-ring flex rounded-sm font-display text-[32px] leading-none font-extrabold text-accent"
      >
        <Atom.LogoMark animation="hover" />
      </Link>
      <ul className="flex w-full shrink-0 flex-col items-center gap-4">
        <RailSlot label="Home">
          <Link
            href="/"
            aria-label="Home"
            data-tour="home"
            aria-current={pathname === "/" ? "page" : undefined}
            className={itemClass(pathname === "/")}
          >
            <House size={20} />
          </Link>
        </RailSlot>
        <RailSlot label="Library">
          <Link
            href="/library"
            aria-label="Library"
            aria-current={inLibrary ? "page" : undefined}
            data-tour="library"
            className={itemClass(inLibrary)}
          >
            <LibraryBig size={20} />
          </Link>
        </RailSlot>
        <li aria-hidden className="h-px w-full shrink-0 bg-divider" />
      </ul>
      <DndContext
        id="community-rail"
        sensors={sensors}
        collisionDetection={railCollision}
        modifiers={[restrictToVerticalAxis]}
        autoScroll={{ threshold: { x: 0, y: 0.1 } }}
        onDragStart={({ active }) => {
          suppressClick.current = true;
          setDragging(String(active.id));
        }}
        onDragMove={trackDrop}
        onDragOver={trackDrop}
        onDragEnd={handleDragEnd}
        onDragCancel={finishDrag}
      >
      <ul
        ref={scrollList}
        onScroll={measureOverflow}
        style={fadeMask(overflow)}
        className="-mx-4 -my-1 flex min-h-0 w-[calc(100%+2rem)] flex-1 flex-col items-center gap-4 overflow-y-auto px-4 py-2 [scrollbar-width:none]"
      >
        {communities.length > 0 && (
        <li data-tour="communities" className="w-full">
        <ul className="flex w-full flex-col items-center gap-4">
          <SortableContext
            items={visible}
            strategy={noShift}
          >
            {items.map((item) => {
              if (item.type === "community") {
                const community = byId.get(item.communityId);
                return (
                  community && (
                    <SortableCommunity
                      key={communityKey(community.id)}
                      community={community}
                      active={community.id === activeId}
                      drop={drop?.overKey === communityKey(community.id) ? drop.drop : undefined}
                    />
                  )
                );
              }

              const members = item.communityIds.flatMap((id) => byId.get(id) ?? []);
              const open = isOpen(item);
              const closing = closingFolders.has(item.id);
              const opening = openingFolders.has(item.id);
              const folder = (
                <SortableFolder
                  key={folderKey(item.id)}
                  folder={item}
                  communities={members}
                  open={open}
                  active={item.communityIds.includes(activeId)}
                  drop={drop?.overKey === folderKey(item.id) ? drop.drop : undefined}
                  onToggle={() => toggleFolder(item.id)}
                  onEdit={() => setEditing(item)}
                  onUngroup={() => saveLayout(ungroup(items, item.id))}
                />
              );
              if (!open) return folder;

              return (
                <li
                  key={folderKey(item.id)}
                  className="-mx-1.5 w-[calc(100%+0.75rem)]"
                >
                  <ul
                    style={closing ? undefined : tint(item.color, "26")}
                    className={`flex flex-col items-center rounded-[30px] py-1.5 transition-colors duration-200 motion-reduce:transition-none ${
                      opening ? "starting:bg-transparent" : ""
                    } ${
                      closing ? "bg-transparent" : item.color ? "" : "bg-rail-item/60"
                    }`}
                  >
                    {folder}
                    <li
                      className={`grid w-full transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
                        opening ? "starting:grid-rows-[0fr] starting:opacity-0" : ""
                      } ${
                        closing ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                      }`}
                    >
                      <div className="-mt-1 -mb-3 min-h-0 overflow-hidden">
                        <ul className="flex flex-col items-center gap-4 pt-5 pb-3">
                          {members.map((community) => (
                            <SortableCommunity
                              key={communityKey(community.id)}
                              community={community}
                              active={community.id === activeId}
                              drop={drop?.overKey === communityKey(community.id) ? drop.drop : undefined}
                            />
                          ))}
                        </ul>
                      </div>
                    </li>
                  </ul>
                </li>
              );
            })}
          </SortableContext>
        </ul>
        </li>
        )}
        <RailEndDrop highlighted={drop?.overKey === RAIL_END_KEY} />
      </ul>
      <DragOverlay dropAnimation={null} className="pointer-events-none flex justify-center">
        {draggedCommunity && (
          <div
            aria-hidden
            className={`${itemClass(draggedCommunity.id === activeId)} cursor-grabbing ring-2 ring-accent ring-offset-2 ring-offset-rail`}
          >
            <Atom.CommunityIcon
              name={draggedCommunity.name}
              src={draggedCommunity.iconUrl}
            />
          </div>
        )}
      </DragOverlay>
      </DndContext>
      <div aria-hidden className="h-px w-full shrink-0 bg-divider" />
      <ul className="flex w-full shrink-0 flex-col items-center gap-4">
        <RailSlot
          label={
            readOnly
              ? "Confirm your email first to create a community."
              : newAccountWait
                ? newAccountMessage("create a community", newAccountWait)
                : "Create a community"
          }
        >
          <button
            type="button"
            aria-label="Create a community"
            aria-disabled={createBlocked || undefined}
            data-tour="create"
            onClick={() => {
              if (!createBlocked) setCreating(true);
            }}
            className={`${itemClass(false)} ${createBlocked ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <Plus size={20} />
          </button>
        </RailSlot>
        <RailSlot label="Explore communities">
          <Link
            href="/explore"
            aria-label="Explore communities"
            data-tour="explore"
            aria-current={pathname === "/explore" ? "page" : undefined}
            className={itemClass(pathname === "/explore")}
          >
            <Compass size={20} />
          </Link>
        </RailSlot>
      </ul>
      <CreateCommunityModal open={creating} onClose={() => setCreating(false)} />
      <FolderSettingsModal
        folder={editing}
        onClose={() => setEditing(null)}
        onSave={(changes) =>
          editing &&
          saveLayout(
            items.map((item) =>
              item.type === "folder" && item.id === editing.id ? { ...item, ...changes } : item,
            ),
          )
        }
        onUngroup={() => editing && saveLayout(ungroup(items, editing.id))}
      />
    </nav>
  );
}

export function CommunityRailBackdrop() {
  const railOpen = useLayoutStore((state) => state.railOpen);
  const setRailOpen = useLayoutStore((state) => state.setRailOpen);

  if (!railOpen) return null;

  return (
    <div
      aria-hidden
      onClick={() => setRailOpen(false)}
      className="fixed inset-0 z-40 bg-black/50 sm:hidden"
    />
  );
}

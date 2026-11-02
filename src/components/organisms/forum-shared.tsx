"use client";

import { Pagination, Tooltip } from "antd";
import { ChevronRight, Megaphone, MessagesSquare, ShieldCheck } from "lucide-react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import type { Community, ForumCategoryRef } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

type ForumContextValue = { community: Community; joinPrompt?: ReactNode };

const ForumContext = createContext<ForumContextValue | null>(null);

export function ForumProvider({
  community,
  joinPrompt,
  children,
}: ForumContextValue & { children: ReactNode }) {
  return <ForumContext value={{ community, joinPrompt }}>{children}</ForumContext>;
}

export function useForum() {
  const value = useContext(ForumContext);
  if (!value) throw new Error("useForum needs a ForumProvider.");
  return value;
}

export const SUGGESTED_ICONS: IconName[] = [
  "megaphone",
  "scroll-text",
  "newspaper",
  "calendar-days",
  "circle-help",
  "lightbulb",
  "users",
  "hand-heart",
  "tv",
  "clapperboard",
  "popcorn",
  "film",
  "book-open",
  "gamepad-2",
  "dice-5",
  "puzzle",
  "music",
  "headphones",
  "mic",
  "camera",
  "palette",
  "brush",
  "pen-tool",
  "image",
  "sparkles",
  "wand-sparkles",
  "star",
  "heart",
  "flame",
  "zap",
  "trophy",
  "crown",
  "sword",
  "swords",
  "shield",
  "drama",
  "ghost",
  "skull",
  "bot",
  "rocket",
  "globe",
  "map",
  "moon",
  "sun",
  "flower",
  "leaf",
  "cat",
  "dog",
  "coffee",
  "pizza",
  "gift",
  "party-popper",
  "laugh",
  "message-circle",
];

const knownIcons = new Set<string>(iconNames);

export function iconLabel(icon: string | null) {
  if (!icon) return "Speech bubbles";
  const words = icon.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function CategoryGlyph({ icon, size }: { icon: string | null; size: number }) {
  return icon && knownIcons.has(icon) ? (
    <DynamicIcon name={icon as IconName} size={size} />
  ) : (
    <MessagesSquare size={size} />
  );
}

export function CategoryIcon({
  icon,
  color,
  size = "large",
}: {
  icon: string | null;
  color: string | null;
  size?: "large" | "small";
}) {
  return (
    <span
      aria-hidden
      style={color ? { color, backgroundColor: `${color}26` } : undefined}
      className={`flex shrink-0 items-center justify-center rounded-lg ${
        color ? "" : "bg-accent-soft text-accent"
      } ${size === "large" ? "h-10 w-10" : "h-8 w-8"}`}
    >
      <CategoryGlyph icon={icon} size={size === "large" ? 18 : 16} />
    </span>
  );
}

export const ADMIN_ONLY_NOTE =
  "Only owners and admins can start threads here. Members can still reply.";

export const FEED_NOTE = "New threads here are also posted to the community feed.";

function CategoryMark({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip title={label} classNames={{ root: "touch-visible" }}>
      <span
        role="img"
        aria-label={label}
        tabIndex={0}
        className="focus-ring relative z-10 inline-flex shrink-0 cursor-help rounded-sm text-accent"
      >
        {children}
      </span>
    </Tooltip>
  );
}

export function AdminOnlyMark({ label = ADMIN_ONLY_NOTE, size = 14 }: { label?: string; size?: number }) {
  return (
    <CategoryMark label={label}>
      <ShieldCheck size={size} aria-hidden />
    </CategoryMark>
  );
}

export function FeedMark({ size = 14 }: { size?: number }) {
  return (
    <CategoryMark label={FEED_NOTE}>
      <Megaphone size={size} aria-hidden />
    </CategoryMark>
  );
}

export function forumHref(communityId: number) {
  return `/communities/${communityId}/forum`;
}

export function categoryHref(communityId: number, categoryId: number) {
  return `${forumHref(communityId)}/${categoryId}`;
}

export function sectionAnchor(sectionId: number) {
  return `section-${sectionId}`;
}

export function categoryCrumbs(
  communityId: number,
  category: ForumCategoryRef,
  linkCategory: boolean,
) {
  return [
    { label: "Forum", href: forumHref(communityId) },
    ...(category.section
      ? [
          {
            label: category.section.name,
            href: `${forumHref(communityId)}#${sectionAnchor(category.section.id)}`,
          },
        ]
      : []),
    {
      label: category.name,
      href: linkCategory ? categoryHref(communityId, category.id) : undefined,
    },
  ];
}

export function threadHref(communityId: number, threadId: number, postId?: number) {
  const href = `${forumHref(communityId)}/threads/${threadId}`;
  return postId === undefined ? href : `${href}?post=${postId}`;
}

export function forumToken() {
  const { token } = useAuthStore.getState();
  if (!token) throw new Error("Please log in again.");
  return token;
}

export function scrollColumnToTop(element: HTMLElement | null) {
  let node = element?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      node.scrollTop = 0;
      return;
    }
    node = node.parentElement;
  }
}

export function positiveParam(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

export function ForumBreadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted">
        {items.map((item, index) => (
          <li key={`${index}-${item.label}`} className="flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRight size={12} aria-hidden className="shrink-0" />}
            {item.href ? (
              <Link
                href={item.href}
                className="focus-ring truncate rounded-sm font-semibold transition-colors hover:text-accent"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ForumPagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  if (total <= pageSize) return null;

  return (
    <div className="flex justify-center">
      <div className="rounded-lg border border-divider bg-surface px-2 py-1">
        <Pagination
          align="center"
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger={false}
          onChange={(next) => router.push(next === 1 ? pathname : `${pathname}?page=${next}`)}
        />
      </div>
    </div>
  );
}

export function ForumEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-divider bg-surface px-6 py-10 text-center">
      <p className="font-display text-xl font-bold">{title}</p>
      <p className="max-w-sm text-[13px] text-muted">{description}</p>
    </div>
  );
}

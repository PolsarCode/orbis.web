"use client";

import { MessagesSquare, Settings2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { canManage, getForum, type ForumCategory, type ForumIndex as ForumData } from "@/lib/api";
import { pageTitle } from "@/lib/site-title";
import { timeAgo } from "@/lib/time";
import { useDocumentTitle } from "@/lib/use-document-title";
import { useAuthStore } from "@/stores/auth-store";
import {
  AdminOnlyMark,
  CategoryIcon,
  categoryHref,
  sectionAnchor,
  threadHref,
  useForum,
} from "./forum-shared";

function CategoryRow({
  category,
  communityId,
  adminOnly,
}: {
  category: ForumCategory;
  communityId: number;
  adminOnly: boolean;
}) {
  const threads = `${category.threadCount} ${category.threadCount === 1 ? "thread" : "threads"}`;

  return (
    <li className="relative">
      <div className="flex items-center gap-4 p-4 transition-colors hover:bg-rail-item/40">
        <CategoryIcon icon={category.icon} color={category.color} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <Link
              href={categoryHref(communityId, category.id)}
              className="focus-ring truncate rounded-sm text-sm font-semibold transition-colors after:absolute after:inset-0 hover:text-accent"
            >
              {category.name}
            </Link>
            {adminOnly && <AdminOnlyMark />}
          </span>
          {category.description && (
            <span className="line-clamp-2 text-xs text-muted">{category.description}</span>
          )}
          <span className="text-xs text-muted sm:hidden">{threads}</span>
        </span>
        <span className="hidden w-52 shrink-0 flex-col items-end gap-0.5 text-right text-xs text-muted sm:flex">
          <span className="font-semibold text-foreground tabular-nums">{threads}</span>
          {category.latest ? (
            <Link
              href={threadHref(communityId, category.latest.id)}
              className="focus-ring relative z-10 flex max-w-full gap-1 rounded-sm transition-colors hover:text-foreground"
            >
              <span className="truncate">{category.latest.title}</span>
              <span className="shrink-0">· {timeAgo(category.latest.lastPostAt)}</span>
            </Link>
          ) : (
            <span>No threads yet</span>
          )}
        </span>
      </div>
    </li>
  );
}

function CategoryList({
  id,
  title,
  categories,
  communityId,
  sectionAdminOnly = false,
}: {
  id?: string;
  title?: string;
  categories: ForumCategory[];
  communityId: number;
  sectionAdminOnly?: boolean;
}) {
  return (
    <section
      id={id}
      aria-label={title ?? "Categories"}
      className="scroll-mt-4 overflow-hidden rounded-lg border border-divider bg-surface"
    >
      {title && (
        <h3 className="border-b border-divider px-4 py-2.5 text-xs font-bold tracking-wide text-muted uppercase">
          {title}
        </h3>
      )}
      <ul className="flex flex-col divide-y divide-divider">
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            communityId={communityId}
            adminOnly={sectionAdminOnly || category.adminOnly}
          />
        ))}
      </ul>
    </section>
  );
}

export function ForumIndex() {
  const { community } = useForum();
  const [loaded, setLoaded] = useState<{ attempt: number; forum: ForumData | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const manager = canManage(community);
  useDocumentTitle(pageTitle(community.name, "Forum"));

  useEffect(() => {
    let ignore = false;
    getForum(useAuthStore.getState().token, community.id)
      .then((forum) => {
        if (!ignore) setLoaded({ attempt, forum });
      })
      .catch(() => {
        if (!ignore) setLoaded({ attempt, forum: null });
      });
    return () => {
      ignore = true;
    };
  }, [community.id, attempt]);

  useEffect(() => {
    if (!loaded?.forum || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [loaded]);

  if (!loaded || loaded.attempt !== attempt) {
    return <Molecule.FeedSkeleton label="Loading the forum" />;
  }
  if (!loaded.forum) {
    return <Molecule.ConnectionError onRetry={() => setAttempt((count) => count + 1)} />;
  }

  const { sections, categories } = loaded.forum;
  const settingsHref = `/communities/${community.id}/settings?tab=forum`;

  if (categories.length === 0) {
    return (
      <Molecule.FeedState
        eyebrow="Forum"
        icon={<MessagesSquare size={24} strokeWidth={1.5} />}
        title="No categories yet."
        description={
          manager
            ? "Add a few categories, like General or Recommendations, so members can start threads."
            : "The admins haven’t set up the forum yet. Check back soon."
        }
        action={
          manager && (
            <Atom.ButtonLink href={settingsHref} icon={<Settings2 size={16} />}>
              Add categories
            </Atom.ButtonLink>
          )
        }
      />
    );
  }

  const ungrouped = categories.filter(({ sectionId }) => sectionId === null);
  const grouped = sections
    .map((section) => ({
      section,
      categories: categories.filter(({ sectionId }) => sectionId === section.id),
    }))
    .filter((group) => group.categories.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-divider bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-2xl font-bold">Forum</h2>
          <p className="text-xs text-muted">Longer conversations, sorted by topic.</p>
        </div>
        {manager && (
          <Atom.ButtonLink
            href={settingsHref}
            size="small"
            variant="secondary"
            icon={<Settings2 size={14} />}
          >
            Manage forum
          </Atom.ButtonLink>
        )}
      </header>
      {ungrouped.length > 0 && (
        <CategoryList categories={ungrouped} communityId={community.id} />
      )}
      {grouped.map(({ section, categories: items }) => (
        <CategoryList
          key={section.id}
          id={sectionAnchor(section.id)}
          title={section.name}
          categories={items}
          communityId={community.id}
          sectionAdminOnly={section.adminOnly}
        />
      ))}
    </div>
  );
}

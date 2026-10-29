"use client";

import { Modal } from "antd";
import {
  Bell,
  Check,
  Clock,
  Compass,
  Library,
  Newspaper,
  Search,
  Settings,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import * as Atom from "@atom";
import {
  getLibrary,
  searchCommunities,
  searchLibrary,
  searchPeople,
  searchPosts,
  searchReports,
  type CommunitySearchResult,
  type FeedEntry,
  type FriendUser,
  type LibraryEntry,
  type MediaResult,
  type MediaType,
  type Post,
  type Report,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { mediaPath, statusLabel } from "@/lib/library";
import { ticketNumber } from "@/lib/ticket";
import { useAuthStore } from "@/stores/auth-store";
import {
  searchSources,
  useSearchStore,
  type SearchFilter,
  type SearchScope as Scope,
  type SearchSource,
} from "@/stores/search-store";
import { mediaTypes } from "./activity-card";
import { JoinAction, useJoin } from "./community-search";
import { DiscussionModal } from "./discussion-modal";
import { AddToLibraryButton } from "./library-controls";
import { MediaCover } from "./library-view";
import { FriendAction } from "./member-list";
import { categoryStyle, columns } from "./report-board";

const MIN_QUERY = 2;
const PREVIEW = 3;
const DEBOUNCE_MS = 250;
const RECENT_KEY = "orbis:recent-search";
const RECENT_LIMIT = 6;

const sourceLabels: Record<SearchSource, string> = {
  posts: "Posts",
  titles: "Titles",
  people: "People",
  communities: "Communities",
  library: "Your library",
  tickets: "Tickets",
};

const shortcuts = [
  { href: "/library", label: "Your library", icon: Library },
  { href: "/explore", label: "Explore communities", icon: Compass },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

type RecentItem = { href: string; title: string; subtitle: string };
type Recent = { queries: string[]; items: RecentItem[] };

function isRecentItem(value: unknown): value is RecentItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.href === "string" &&
    item.href.startsWith("/") &&
    !item.href.startsWith("//") &&
    typeof item.title === "string" &&
    typeof item.subtitle === "string"
  );
}

function readRecent(): Recent {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "null") as {
      queries?: unknown;
      items?: unknown;
    } | null;
    return {
      queries: Array.isArray(saved?.queries)
        ? saved.queries.filter((query): query is string => typeof query === "string")
        : [],
      items: Array.isArray(saved?.items) ? saved.items.filter(isRecentItem) : [],
    };
  } catch {
    return { queries: [], items: [] };
  }
}

function saveRecent(recent: Recent) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    return true;
  } catch {
    return false;
  }
}

function remember(query: string, item?: RecentItem) {
  const recent = readRecent();
  const trimmed = query.trim();
  saveRecent({
    queries:
      trimmed.length >= MIN_QUERY
        ? [
            trimmed,
            ...recent.queries.filter((saved) => saved.toLowerCase() !== trimmed.toLowerCase()),
          ].slice(0, RECENT_LIMIT)
        : recent.queries,
    items: item
      ? [item, ...recent.items.filter((saved) => saved.href !== item.href)].slice(0, RECENT_LIMIT)
      : recent.items,
  });
}

function plainText(html: string) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}

function interleave(groups: Record<MediaType, MediaResult[]>) {
  const lists = (Object.keys(mediaTypes) as MediaType[]).map((type) => groups[type] ?? []);
  const longest = Math.max(0, ...lists.map((list) => list.length));
  return Array.from({ length: longest }, (_, index) =>
    lists.flatMap((list) => (list[index] ? [list[index]] : [])),
  ).flat();
}

const loadPosts = (token: string, query: string) => searchPosts(token, query);
const loadTitles = (token: string, query: string) => searchLibrary(token, query).then(interleave);
const loadPeople = (token: string, query: string) => searchPeople(token, query.replace(/^@/, ""));
const loadCommunities = (token: string, query: string) => searchCommunities(token, query);
const loadTickets = (token: string, query: string) => searchReports(token, query);

type Loaded<T> = { query: string; data: T | null };
type Rows = { status: "loading" | "failed" | "done"; items: ReactNode[] };

function useResults<T>(
  query: string,
  enabled: boolean,
  load: (token: string, query: string) => Promise<T>,
) {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!enabled || !token || query.length < MIN_QUERY) return;
    let ignore = false;
    load(token, query)
      .then((data) => {
        if (!ignore) setLoaded({ query, data });
      })
      .catch(() => {
        if (!ignore) setLoaded({ query, data: null });
      });
    return () => {
      ignore = true;
    };
  }, [enabled, load, query]);

  return loaded?.query === query ? loaded : null;
}

function rowsOf<T>(loaded: Loaded<T[]> | null, render: (item: T) => ReactNode): Rows {
  if (!loaded) return { status: "loading", items: [] };
  if (!loaded.data) return { status: "failed", items: [] };
  return { status: "done", items: loaded.data.map(render) };
}

const rowClass =
  "focus-ring flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left text-foreground hover:text-foreground";

function ResultRow({
  href,
  onSelect,
  icon,
  title,
  verified = false,
  subtitle,
  detail,
  action,
}: {
  href?: string;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  verified?: boolean;
  subtitle?: string;
  detail?: string;
  action?: ReactNode;
}) {
  const body = (
    <>
      <span aria-hidden className="flex w-8 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
          <span className="truncate">{title}</span>
          {verified && <Atom.VerifiedBadge />}
        </span>
        {subtitle && <span className="truncate text-xs text-muted">{subtitle}</span>}
        {detail && <span className="truncate text-[11px] text-muted">{detail}</span>}
      </span>
    </>
  );

  return (
    <li className="flex items-center gap-2 rounded-lg pr-2 transition-colors hover:bg-rail-item/60">
      {href ? (
        <Link href={href} onClick={onSelect} data-search-result className={rowClass}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onSelect} data-search-result className={rowClass}>
          {body}
        </button>
      )}
      {action && <span className="shrink-0">{action}</span>}
    </li>
  );
}

function ResultSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex min-h-6 items-center justify-between gap-2 px-2">
        <h3 className="text-[11px] font-bold text-muted uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const linkButtonClass =
  "focus-ring cursor-pointer rounded-sm text-xs font-semibold text-accent hover:underline";

function SearchHome({
  recent,
  onPick,
  onSelect,
  onClear,
}: {
  recent: Recent;
  onPick: (query: string) => void;
  onSelect: (item?: RecentItem) => void;
  onClear: () => void;
}) {
  const hasRecent = recent.queries.length > 0 || recent.items.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {recent.queries.length > 0 && (
        <ResultSection
          title="Recent searches"
          action={
            <button type="button" onClick={onClear} className={linkButtonClass}>
              Clear
            </button>
          }
        >
          <div className="flex flex-wrap gap-1.5 px-2">
            {recent.queries.map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => onPick(query)}
                className="focus-ring cursor-pointer rounded-full border border-divider px-2.5 py-1 text-xs font-semibold transition-colors hover:border-accent hover:text-accent"
              >
                {query}
              </button>
            ))}
          </div>
        </ResultSection>
      )}
      {recent.items.length > 0 && (
        <ResultSection
          title="Recently opened"
          action={
            recent.queries.length === 0 && (
              <button type="button" onClick={onClear} className={linkButtonClass}>
                Clear
              </button>
            )
          }
        >
          <ul>
            {recent.items.map((item) => (
              <ResultRow
                key={item.href}
                href={item.href}
                onSelect={() => onSelect(item)}
                icon={<Clock size={18} className="text-muted" />}
                title={item.title}
                subtitle={item.subtitle}
              />
            ))}
          </ul>
        </ResultSection>
      )}
      <ResultSection title="Go to">
        <ul>
          {shortcuts.map(({ href, label, icon: Icon }) => (
            <ResultRow
              key={href}
              href={href}
              onSelect={() => onSelect()}
              icon={<Icon size={18} className="text-muted" />}
              title={label}
            />
          ))}
        </ul>
      </ResultSection>
      {!hasRecent && (
        <p className="px-2 text-xs text-muted">
          Search people, communities, anime, manga, games, and posts from anywhere.
        </p>
      )}
    </div>
  );
}

const RESULT_SELECTOR =
  "[data-search-result], [data-search-page] a[href], [data-search-page] button:not([disabled])";

function focusables(container: HTMLElement | null) {
  return container ? [...container.querySelectorAll<HTMLElement>(RESULT_SELECTOR)] : [];
}

function SearchPanel({
  scope,
  onOpenItem,
}: {
  scope: Scope | null;
  onOpenItem: (item: FeedEntry) => void;
}) {
  const query = useSearchStore((state) => state.query);
  const filter = useSearchStore((state) => state.filter);
  const setQuery = useSearchStore((state) => state.setQuery);
  const setFilter = useSearchStore((state) => state.setFilter);
  const closeSearch = useSearchStore((state) => state.closeSearch);
  const libraryChanged = useSearchStore((state) => state.libraryChanged);
  const me = useAuthStore((state) => state.profile?.userId);
  const isAdmin = useAuthStore((state) => Boolean(state.profile?.isAdmin));
  const { join, joining, error: joinError } = useJoin();
  const [search, setSearch] = useState(query.trim());
  const [library, setLibrary] = useState<LibraryEntry[] | null>(null);
  const [recent, setRecent] = useState(readRecent);
  const panel = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    let ignore = false;
    getLibrary(token)
      .then((entries) => {
        if (!ignore) setLibrary(entries);
      })
      .catch(() => {
        if (!ignore) setLibrary([]);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const section = scope?.section ?? null;
  const active: SearchFilter =
    (filter === "page" && !section) || (filter === "tickets" && !isAdmin) ? "all" : filter;
  const wants = (source: SearchSource) => active === "all" || active === source;
  const posts = useResults(search, wants("posts"), loadPosts);
  const titles = useResults(search, wants("titles"), loadTitles);
  const people = useResults(search, wants("people"), loadPeople);
  const communities = useResults(search, wants("communities"), loadCommunities);
  const tickets = useResults(search, isAdmin && wants("tickets"), loadTickets);
  const saved = new Map((library ?? []).map((entry) => [entry.mediaId, entry]));
  const needle = search.toLowerCase();

  function select(item?: RecentItem) {
    remember(search, item);
    closeSearch();
  }

  function openItem(item: FeedEntry) {
    remember(search);
    closeSearch();
    onOpenItem(item);
  }

  function added(entry: LibraryEntry) {
    setLibrary((current) => [entry, ...(current ?? [])]);
    scope?.onAdded?.(entry);
    libraryChanged();
  }

  const rows: Record<SearchSource, Rows> = {
    posts: rowsOf(posts, (item: Post) => {
      const text = plainText(item.content).trim();
      const place = item.community
        ? `In ${item.community.name}`
        : `On ${displayName(item.wallUser ?? item.author)}’s wall`;
      return (
        <ResultRow
          key={`${item.type}-${item.id}`}
          onSelect={() => openItem(item)}
          icon={<Newspaper size={18} className="text-muted" />}
          title={displayName(item.author)}
          subtitle={text || undefined}
          detail={place}
        />
      );
    }),
    titles: rowsOf(titles, (media: MediaResult) => {
      const entry = saved.get(media.id);
      const href = mediaPath(media.type, media.sourceId);
      const subtitle = [mediaTypes[media.type].label, media.year].filter(Boolean).join(" · ");
      return (
        <ResultRow
          key={media.id}
          href={href}
          onSelect={() => select({ href, title: media.title, subtitle })}
          icon={<MediaCover src={media.coverImage} className="w-8" />}
          title={media.title}
          subtitle={subtitle}
          action={
            entry ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-online">
                <Check size={14} aria-hidden />
                {statusLabel(entry.status, entry.mediaType)}
              </span>
            ) : (
              <AddToLibraryButton media={media} onAdded={added} label="Add" />
            )
          }
        />
      );
    }),
    people: rowsOf(people, (user: FriendUser) => {
      const href = `/users/${user.username}`;
      const name = displayName(user);
      return (
        <ResultRow
          key={user.userId}
          href={href}
          onSelect={() => select({ href, title: name, subtitle: `@${user.username}` })}
          icon={<Atom.Avatar size="sm" label={name} src={user.avatarUrl} seed={user.userId} />}
          title={name}
          verified={user.isVerified}
          subtitle={`@${user.username}`}
          action={<FriendAction userId={user.userId} self={user.userId === me} addLabel="Connect" />}
        />
      );
    }),
    communities: rowsOf(communities, (community: CommunitySearchResult) => {
      const href = `/communities/${community.id}`;
      const subtitle = `${community.memberCount.toLocaleString()} ${
        community.memberCount === 1 ? "member" : "members"
      }`;
      return (
        <ResultRow
          key={community.id}
          href={href}
          onSelect={() => select({ href, title: community.name, subtitle })}
          icon={
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-rail-item font-display text-sm font-bold">
              <Atom.CommunityIcon name={community.name} src={community.iconUrl} />
            </span>
          }
          title={community.name}
          verified={community.isVerified}
          subtitle={subtitle}
          action={
            <JoinAction
              community={community}
              joining={joining}
              onJoin={(id) => {
                remember(search);
                join(id);
              }}
            />
          }
        />
      );
    }),
    library: rowsOf(
      library && { query: search, data: library.filter((entry) => entry.title.toLowerCase().includes(needle)) },
      (entry: LibraryEntry) => {
        const href = mediaPath(entry.mediaType, entry.sourceId);
        const subtitle = statusLabel(entry.status, entry.mediaType);
        return (
          <ResultRow
            key={entry.id}
            href={href}
            onSelect={() => select({ href, title: entry.title, subtitle })}
            icon={<MediaCover src={entry.coverImage} className="w-8" />}
            title={entry.title}
            subtitle={subtitle}
          />
        );
      },
    ),
    tickets: rowsOf(tickets, (report: Report) => {
      const href = `/reports?report=${report.id}`;
      const title = report.message.split("\n")[0];
      const status = columns.find((column) => column.status === report.status)?.title;
      const subtitle = [
        ticketNumber(report.id),
        categoryStyle[report.category].label,
        report.hiddenAt ? "Hidden" : status,
      ].join(" · ");
      return (
        <ResultRow
          key={report.id}
          href={href}
          onSelect={() => select({ href, title, subtitle })}
          icon={<Ticket size={18} className="text-muted" />}
          title={title}
          subtitle={subtitle}
          detail={`From ${displayName(report.author)}`}
        />
      );
    }),
  };

  const available = searchSources.filter((source) => source !== "tickets" || isAdmin);
  const order: SearchSource[] =
    scope?.lead && available.includes(scope.lead)
      ? [scope.lead, ...available.filter((source) => source !== scope.lead)]
      : available;
  const chips: { value: SearchFilter; label: string }[] = [
    { value: "all", label: "All" },
    ...(section ? [{ value: "page" as const, label: section.label }] : []),
    ...order.map((source) => ({ value: source, label: sourceLabels[source] })),
  ];
  const searching = search.length >= MIN_QUERY;
  const sources = active === "all" ? order : active === "page" ? [] : [active];
  const shown = sources.filter(
    (source) => active !== "all" || rows[source].status === "failed" || rows[source].items.length > 0,
  );
  const pending = sources.some((source) => rows[source].status === "loading");
  const nothing =
    active === "all" && !section && !pending && shown.length === 0 && searching;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = focusables(results.current);
    if (items.length === 0) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") {
      items[Math.min(index + 1, items.length - 1)].focus();
    } else if (index <= 0) {
      panel.current?.querySelector("input")?.focus();
    } else {
      items[index - 1].focus();
    }
  }

  return (
    <div
      ref={panel}
      onKeyDown={handleKeyDown}
      className="flex max-h-[min(80dvh,680px)] flex-col"
    >
      <h2 className="sr-only">Search</h2>
      <div className="border-b border-divider px-2 py-2">
        <Atom.Input
          autoFocus
          size="large"
          variant="borderless"
          aria-label="Search Orbis"
          className="!outline-none"
          placeholder={
            section
              ? `Search ${section.label} and everywhere…`
              : "Search people, titles, communities, and posts…"
          }
          prefix={<Search size={18} className="text-muted" />}
          allowClear
          autoCapitalize="none"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onPressEnter={(event) => {
            event.preventDefault();
            results.current?.querySelector<HTMLElement>("[data-search-result]")?.click();
          }}
        />
      </div>
      {searching && (
        <div
          role="group"
          aria-label="Search in"
          className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-divider px-3 py-2 [scrollbar-width:none]"
        >
          {chips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              aria-pressed={active === chip.value}
              onClick={() => setFilter(chip.value)}
              className={`focus-ring shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                active === chip.value
                  ? "bg-accent text-accent-foreground"
                  : "border border-divider text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
      <div ref={results} className="min-h-0 flex-1 overflow-y-auto p-2">
        {!searching ? (
          <SearchHome
            recent={recent}
            onPick={setQuery}
            onSelect={(item) => {
              if (item) remember("", item);
              closeSearch();
            }}
            onClear={() => {
              const empty = { queries: [], items: [] };
              saveRecent(empty);
              setRecent(empty);
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {section && (active === "all" || active === "page") && (
              <ResultSection title={section.label}>
                <div data-search-page className="px-2">
                  {section.render(search, { openItem })}
                </div>
              </ResultSection>
            )}
            {shown.map((source) => {
              const { status, items } = rows[source];
              const preview = active === "all" ? items.slice(0, PREVIEW) : items;
              return (
                <ResultSection
                  key={source}
                  title={sourceLabels[source]}
                  action={
                    active === "all" &&
                    items.length > PREVIEW && (
                      <button
                        type="button"
                        onClick={() => setFilter(source)}
                        className={linkButtonClass}
                      >
                        See all {items.length}
                      </button>
                    )
                  }
                >
                  {source === "communities" && joinError && (
                    <Atom.ErrorMessage>{joinError}</Atom.ErrorMessage>
                  )}
                  {status === "loading" ? (
                    <div className="flex justify-center py-4">
                      <Atom.Loader />
                    </div>
                  ) : status === "failed" ? (
                    <p className="px-2 py-2 text-xs text-muted">
                      Couldn’t search {sourceLabels[source].toLowerCase()} right now.
                    </p>
                  ) : items.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-muted">
                      No {sourceLabels[source].toLowerCase()} match “{search}”.
                    </p>
                  ) : (
                    <ul>{preview}</ul>
                  )}
                </ResultSection>
              );
            })}
            {active === "all" && pending && (
              <div className="flex justify-center py-2">
                <Atom.Loader />
              </div>
            )}
            {nothing && (
              <p className="py-8 text-center text-sm text-muted">Nothing matches “{search}”.</p>
            )}
          </div>
        )}
      </div>
      <div className="hidden shrink-0 items-center gap-4 border-t border-divider px-4 py-2 text-[11px] text-muted sm:flex pointer-coarse:hidden">
        <span>↑ ↓ to move</span>
        <span>Enter to open</span>
        <span>Esc to close</span>
      </div>
    </div>
  );
}

const subscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export function SearchScope({ lead, section, onAdded }: Scope) {
  const id = useId();
  const setScope = useSearchStore((state) => state.setScope);

  useEffect(() => {
    setScope(id, { lead, section, onAdded });
  });

  useEffect(() => () => setScope(id, null), [id, setScope]);

  return null;
}

export function SiteSearch() {
  const open = useSearchStore((state) => state.open);
  const openSearch = useSearchStore((state) => state.openSearch);
  const closeSearch = useSearchStore((state) => state.closeSearch);
  const scope = useSearchStore((state) => state.scopes.at(-1)?.scope ?? null);
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const pathname = usePathname();
  const mac = useSyncExternalStore(subscribe, isMac, () => false);
  const [item, setItem] = useState<FeedEntry | null>(null);

  useEffect(() => {
    closeSearch();
  }, [pathname, closeSearch]);

  useEffect(() => {
    if (!signedIn) return;

    function handleKey(event: globalThis.KeyboardEvent) {
      const search = useSearchStore.getState();
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (search.open) search.closeSearch();
        else search.openSearch();
      } else if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !search.open &&
        !isTyping(event.target)
      ) {
        event.preventDefault();
        search.openSearch();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [signedIn]);

  return (
    <>
      <button
        type="button"
        data-tour="search"
        aria-label="Search Orbis"
        aria-keyshortcuts="Meta+K Control+K /"
        onClick={() => openSearch()}
        className="focus-ring flex h-9 w-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-divider bg-surface text-sm text-muted transition-colors hover:border-accent hover:text-foreground sm:w-full sm:justify-start sm:px-3"
      >
        <Search size={16} aria-hidden className="shrink-0" />
        <span className="hidden min-w-0 flex-1 truncate text-left sm:block">Search…</span>
        <kbd className="hidden shrink-0 rounded-md border border-divider px-1.5 font-sans text-[11px] text-muted sm:inline pointer-coarse:hidden">
          {mac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      <Modal
        open={open && signedIn}
        onCancel={closeSearch}
        footer={null}
        closable={false}
        title={null}
        width={640}
        destroyOnHidden
        className="!top-3 !pb-0 sm:!top-16"
        styles={{ container: { padding: 0, overflow: "hidden" } }}
      >
        <SearchPanel scope={scope} onOpenItem={setItem} />
      </Modal>
      <DiscussionModal item={item} onClose={() => setItem(null)} onChange={setItem} />
    </>
  );
}

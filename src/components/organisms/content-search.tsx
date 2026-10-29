"use client";

import { Newspaper } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import {
  getMembers,
  searchCommunity,
  searchProfile,
  type Member,
  type Post,
  type PublicProfile,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { mediaPath, statusLabel } from "@/lib/library";
import { useAuthStore } from "@/stores/auth-store";
import { MediaCover } from "./library-view";
import { PersonRow } from "./person-row";
import { SearchScope } from "./site-search";

const LIST_LIMIT = 8;

type Section = { title: string; items: ReactNode[] };

function plainText(html: string) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}

function matches(query: string, ...values: (string | null | undefined)[]) {
  const needle = query.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(needle));
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="px-2 text-[11px] font-bold text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

const rowClass =
  "focus-ring flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-rail-item";

function ContentRow({ item, onOpen }: { item: Post; onOpen: () => void }) {
  const text = plainText(item.content);

  return (
    <li>
      <button type="button" onClick={onOpen} className={`${rowClass} items-start`}>
        <span className="mt-0.5 shrink-0 text-muted" aria-hidden>
          <Newspaper size={16} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">
            {displayName(item.author)}
          </span>
          {text && <span className="line-clamp-2 text-xs text-muted">{text}</span>}
        </span>
      </button>
    </li>
  );
}

function LinkRow({
  href,
  icon,
  title,
  verified = false,
  subtitle,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  verified?: boolean;
  subtitle: string;
}) {
  return (
    <li>
      <Link href={href} className={rowClass}>
        {icon}
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
            <span className="truncate">{title}</span>
            {verified && <Atom.VerifiedBadge />}
          </span>
          <span className="truncate text-xs text-muted">{subtitle}</span>
        </span>
      </Link>
    </li>
  );
}

function ContentResults({
  query,
  search,
  sections,
  scope,
  onOpen,
}: {
  query: string;
  search: (query: string) => Promise<Post[]>;
  sections: Section[];
  scope: string;
  onOpen: (item: Post) => void;
}) {
  const [results, setResults] = useState<{ query: string; items: Post[] | null } | null>(
    null,
  );

  useEffect(() => {
    let ignore = false;
    search(query)
      .then((items) => {
        if (!ignore) setResults({ query, items });
      })
      .catch(() => {
        if (!ignore) setResults({ query, items: null });
      });
    return () => {
      ignore = true;
    };
  }, [search, query]);

  if (!results || results.query !== query) {
    return (
      <div className="flex justify-center py-4">
        <Atom.Loader />
      </div>
    );
  }
  if (!results.items) {
    return <Atom.ErrorMessage>Could not search {scope}.</Atom.ErrorMessage>;
  }

  const posts = results.items;
  const shown = sections.filter((section) => section.items.length > 0);

  if (posts.length + shown.length === 0) {
    return <p className="py-4 text-center text-sm text-muted">Nothing in {scope} matches “{query}”.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.length > 0 && (
        <ResultSection title="Posts">
          <ul>
            {posts.map((item) => (
              <ContentRow key={`post-${item.id}`} item={item} onOpen={() => onOpen(item)} />
            ))}
          </ul>
        </ResultSection>
      )}
      {shown.map((section) => (
        <ResultSection key={section.title} title={section.title}>
          <ul className="px-2">{section.items}</ul>
        </ResultSection>
      ))}
    </div>
  );
}

function ContentSearchScope({
  name,
  scope,
  search,
  sections,
}: {
  name: string;
  scope: string;
  search: (query: string) => Promise<Post[]>;
  sections: (query: string) => Section[];
}) {
  return (
    <SearchScope
      section={{
        label: name,
        render: (query, { openItem }) => (
          <ContentResults
            query={query}
            search={search}
            sections={sections(query)}
            scope={scope}
            onOpen={openItem}
          />
        ),
      }}
    />
  );
}

export function CommunitySearchScope({
  communityId,
  communityName,
}: {
  communityId: number;
  communityName: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const search = useCallback(
    (query: string) => searchCommunity(useAuthStore.getState().token, communityId, query),
    [communityId],
  );

  useEffect(() => {
    const { token } = useAuthStore.getState();
    getMembers(token, communityId)
      .then(setMembers)
      .catch(() => null);
  }, [communityId]);

  return (
    <ContentSearchScope
      name={communityName}
      scope="this community"
      search={search}
      sections={(query) => [
        {
          title: "Members",
          items: members
            .filter((member) => matches(query, member.username, member.name, member.nickname))
            .slice(0, LIST_LIMIT)
            .map((member) => (
              <PersonRow
                key={member.userId}
                person={member}
                label={member.nickname ?? displayName(member)}
              />
            )),
        },
      ]}
    />
  );
}

export function ProfileSearchScope({ profile }: { profile: PublicProfile }) {
  const { username } = profile;
  const search = useCallback(
    (query: string) => searchProfile(useAuthStore.getState().token, username, query),
    [username],
  );

  return (
    <ContentSearchScope
      name={`${displayName(profile)}’s profile`}
      scope="this profile"
      search={search}
      sections={(query) => [
        {
          title: "Friends",
          items: profile.friends
            .filter((friend) => matches(query, friend.username, friend.name))
            .slice(0, LIST_LIMIT)
            .map((friend) => <PersonRow key={friend.userId} person={friend} />),
        },
        {
          title: "Communities",
          items: profile.communities
            .filter((community) => matches(query, community.name))
            .slice(0, LIST_LIMIT)
            .map((community) => (
              <LinkRow
                key={community.id}
                href={`/communities/${community.id}`}
                icon={
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rail-item font-display text-sm font-bold">
                    <Atom.CommunityIcon name={community.name} src={community.iconUrl} />
                  </span>
                }
                title={community.name}
                verified={community.isVerified}
                subtitle={`${community.memberCount.toLocaleString()} ${
                  community.memberCount === 1 ? "member" : "members"
                }`}
              />
            )),
        },
        {
          title: "Library",
          items: profile.library
            .filter((entry) => matches(query, entry.title))
            .slice(0, LIST_LIMIT)
            .map((entry) => (
              <LinkRow
                key={entry.id}
                href={mediaPath(entry.mediaType, entry.sourceId)}
                icon={<MediaCover src={entry.coverImage} className="w-8" />}
                title={entry.title}
                subtitle={statusLabel(entry.status, entry.mediaType)}
              />
            )),
        },
      ]}
    />
  );
}

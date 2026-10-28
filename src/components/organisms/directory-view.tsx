"use client";

import { Pagination, Tooltip } from "antd";
import { Boxes, Globe, LayoutGrid, List, Lock, MailCheck, MailWarning, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  getDirectoryCommunities,
  getDirectoryUsers,
  setCommunityVerified,
  setProfileVerified,
  type DirectoryCommunity,
  type DirectoryUser,
  type NumberedPage,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { useAuthStore } from "@/stores/auth-store";
import { useDirectoryPreferencesStore } from "@/stores/directory-preferences-store";
import { AdminToggle } from "./admin-toggle";
import { VerifyToggle } from "./verify-toggle";

const tabs = [
  { value: "users", label: "Users", icon: <Users size={16} /> },
  { value: "communities", label: "Communities", icon: <Boxes size={16} /> },
] as const;

type Tab = (typeof tabs)[number]["value"];

const joined = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function usePagedList<T>(load: (token: string, page: number) => Promise<NumberedPage<T>>) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{
    page: number;
    data: NumberedPage<T> | null;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    let ignore = false;
    load(token, page)
      .then((data) => {
        if (!ignore) setResult({ page, data });
      })
      .catch(() => {
        if (!ignore) setResult({ page, data: null });
      });
    return () => {
      ignore = true;
    };
  }, [load, page, attempt]);

  function replace(previous: T, next: T) {
    setResult((current) =>
      current?.data
        ? {
            ...current,
            data: {
              ...current.data,
              items: current.data.items.map((item) => (item === previous ? next : item)),
            },
          }
        : current,
    );
  }

  return {
    page,
    setPage,
    current: result?.page === page ? result : null,
    retry: () => setAttempt((count) => count + 1),
    replace,
  };
}

function signedInToken() {
  const { token } = useAuthStore.getState();
  if (!token) throw new Error("Please log in again.");
  return token;
}

function DirectoryList<T>({
  load,
  label,
  renderCard,
  renderRow,
}: {
  load: (token: string, page: number) => Promise<NumberedPage<T>>;
  label: string;
  renderCard: (item: T, update: (next: T) => void) => ReactNode;
  renderRow: (item: T, update: (next: T) => void) => ReactNode;
}) {
  const view = useDirectoryPreferencesStore((state) => state.view);
  const { page, setPage, current, retry, replace } = usePagedList(load);

  if (!current) {
    return (
      <div className="flex justify-center py-16">
        <Atom.Loader />
      </div>
    );
  }
  if (!current.data) {
    return <Molecule.ConnectionError onRetry={retry} />;
  }

  const { items, total, pageSize } = current.data;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted">
        {total.toLocaleString()} {label}
      </p>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No {label} on this page.</p>
      ) : view === "cards" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => renderCard(item, (next) => replace(item, next)))}
        </ul>
      ) : (
        <ul className="flex flex-col divide-y divide-divider rounded-lg border border-divider bg-surface">
          {items.map((item) => renderRow(item, (next) => replace(item, next)))}
        </ul>
      )}
      {total > pageSize && (
        <Pagination
          align="center"
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger={false}
          onChange={setPage}
        />
      )}
    </div>
  );
}

function UserControls({
  user,
  onChange,
}: {
  user: DirectoryUser;
  onChange: (user: DirectoryUser) => void;
}) {
  return (
    <div className="relative z-20 flex shrink-0 flex-wrap items-center gap-1.5">
      <VerifyToggle
        verified={user.isVerified}
        onToggle={async (verified) =>
          onChange({
            ...user,
            isVerified: await setProfileVerified(signedInToken(), user.username, verified),
          })
        }
      />
      {!user.isHeadAdmin && (
        <AdminToggle
          username={user.username}
          isAdmin={user.isAdmin}
          onChange={(isAdmin) => onChange({ ...user, isAdmin })}
        />
      )}
    </div>
  );
}

function CommunityControls({
  community,
  onChange,
}: {
  community: DirectoryCommunity;
  onChange: (community: DirectoryCommunity) => void;
}) {
  return (
    <div className="relative z-20 flex shrink-0 items-center">
      <VerifyToggle
        verified={community.isVerified}
        onToggle={async (verified) =>
          onChange({
            ...community,
            isVerified: await setCommunityVerified(signedInToken(), community.id, verified),
          })
        }
      />
    </div>
  );
}

function EmailStatus({ confirmedAt }: { confirmedAt: string | null }) {
  return (
    <Tooltip
      title={confirmedAt ? `Email confirmed ${joined(confirmedAt)}` : "Email not confirmed"}
      classNames={{ root: "touch-visible" }}
    >
      <span className="relative flex shrink-0">
        {confirmedAt ? (
          <MailCheck size={14} aria-hidden className="text-success" />
        ) : (
          <MailWarning size={14} aria-hidden className="text-warning" />
        )}
        <span className="sr-only">
          {confirmedAt ? "Email confirmed" : "Email not confirmed"}
        </span>
      </span>
    </Tooltip>
  );
}

function UserCard({
  user,
  onChange,
}: {
  user: DirectoryUser;
  onChange?: (user: DirectoryUser) => void;
}) {
  return (
    <li title={user.email}>
      <Molecule.PersonCard
        userId={user.userId}
        username={user.username}
        label={displayName(user)}
        avatarUrl={user.avatarUrl}
        coverUrl={user.coverUrl}
        isVerified={user.isVerified}
        badge={
          user.isHeadAdmin ? (
            <Atom.RoleBadge role="head-admin" />
          ) : (
            user.isAdmin && <Atom.RoleBadge role="site-admin" />
          )
        }
        action={<span className="text-xs text-muted">Joined {joined(user.createdAt)}</span>}
      >
        {onChange && <UserControls user={user} onChange={onChange} />}
      </Molecule.PersonCard>
    </li>
  );
}

function CommunityCardItem({
  community,
  onChange,
}: {
  community: DirectoryCommunity;
  onChange?: (community: DirectoryCommunity) => void;
}) {
  return (
    <li>
      <Molecule.CommunityCard
        name={community.name}
        iconUrl={community.iconUrl}
        coverUrl={community.coverUrl}
        memberCount={community.memberCount}
        isVerified={community.isVerified}
        href={`/communities/${community.id}`}
        badge={
          <Atom.Pill
            size="xs"
            tone={community.isPublic ? "success" : "neutral"}
            icon={community.isPublic ? <Globe size={10} /> : <Lock size={10} />}
          >
            {community.isPublic ? "Public" : "Private"}
          </Atom.Pill>
        }
        action={
          <Link
            href={`/users/${community.owner.username}`}
            title="Owner"
            className="focus-ring rounded-sm text-xs text-muted hover:text-foreground hover:underline"
          >
            @{community.owner.username}
          </Link>
        }
      >
        {onChange && <CommunityControls community={community} onChange={onChange} />}
      </Molecule.CommunityCard>
    </li>
  );
}

function UserRow({
  user,
  onChange,
}: {
  user: DirectoryUser;
  onChange?: (user: DirectoryUser) => void;
}) {
  const name = displayName(user);

  return (
    <li className="flex items-center gap-3 px-4 py-3 max-sm:flex-wrap">
      <Atom.Avatar size="sm" label={name} src={user.avatarUrl} seed={user.userId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <Molecule.UserLink
            username={user.username}
            verified={user.isVerified}
            className="truncate text-[13px] font-semibold"
          >
            {name}
          </Molecule.UserLink>
          {user.isHeadAdmin ? (
            <Atom.RoleBadge role="head-admin" />
          ) : (
            user.isAdmin && <Atom.RoleBadge role="site-admin" />
          )}
        </span>
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted">
          <span className="truncate">
            @{user.username} · {user.email}
          </span>
          <EmailStatus confirmedAt={user.emailVerifiedAt} />
        </span>
      </div>
      {onChange && (
        <div className="max-sm:basis-full max-sm:pl-11">
          <UserControls user={user} onChange={onChange} />
        </div>
      )}
      <div className="hidden shrink-0 flex-col items-end text-xs text-muted sm:flex">
        <span>Joined {joined(user.createdAt)}</span>
        <span>
          {user.communityCount} {user.communityCount === 1 ? "community" : "communities"}
        </span>
      </div>
    </li>
  );
}

function CommunityRow({
  community,
  onChange,
}: {
  community: DirectoryCommunity;
  onChange?: (community: DirectoryCommunity) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        aria-hidden
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rail-item font-display text-[17px] leading-none font-bold"
      >
        <Atom.CommunityIcon name={community.name} src={community.iconUrl} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex min-w-0 items-center gap-1 text-[13px] font-semibold">
            <span className="truncate">{community.name}</span>
            {community.isVerified && <Atom.VerifiedBadge />}
          </span>
          <Atom.Pill
            size="xs"
            tone={community.isPublic ? "success" : "neutral"}
            icon={community.isPublic ? <Globe size={10} /> : <Lock size={10} />}
          >
            {community.isPublic ? "Public" : "Private"}
          </Atom.Pill>
        </span>
        <span className="truncate text-xs text-muted">
          Owned by{" "}
          <Link
            href={`/users/${community.owner.username}`}
            className="focus-ring rounded-sm hover:text-foreground hover:underline"
          >
            @{community.owner.username}
          </Link>{" "}
          · {community.memberCount.toLocaleString()}{" "}
          {community.memberCount === 1 ? "member" : "members"}
        </span>
      </div>
      {onChange && <CommunityControls community={community} onChange={onChange} />}
      <span className="hidden shrink-0 text-xs text-muted sm:block">
        Created {joined(community.createdAt)}
      </span>
    </li>
  );
}

function ViewToggle() {
  const view = useDirectoryPreferencesStore((state) => state.view);
  const setView = useDirectoryPreferencesStore((state) => state.setView);

  return (
    <div role="group" aria-label="Directory view" className="flex items-center gap-0.5">
      {(
        [
          { value: "cards", label: "Cards", icon: <LayoutGrid size={16} /> },
          { value: "list", label: "List", icon: <List size={16} /> },
        ] as const
      ).map((option) => (
        <Tooltip key={option.value} title={option.label}>
          <button
            type="button"
            aria-label={option.label}
            aria-pressed={view === option.value}
            onClick={() => setView(option.value)}
            className={`icon-button cursor-pointer ${
              view === option.value ? "bg-rail-item text-foreground" : ""
            }`}
          >
            {option.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

export function DirectoryView() {
  const profile = useAuthStore((state) => state.profile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const router = useRouter();
  const [authFailed, setAuthFailed] = useState(false);
  const requested = useSearchParams().get("tab");
  const tab: Tab = tabs.find(({ value }) => value === requested)?.value ?? "users";

  useEffect(() => {
    useDirectoryPreferencesStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    fetchProfile()
      .then((user) => {
        if (!user) router.replace("/login");
      })
      .catch(() => setAuthFailed(true));
  }, [fetchProfile, router]);

  if (authFailed) {
    return <Molecule.ConnectionError onRetry={() => window.location.reload()} />;
  }

  if (!profile) {
    return (
      <div className="flex flex-1 justify-center py-16">
        <Atom.Loader />
      </div>
    );
  }

  if (!profile.isAdmin) {
    return (
      <div className="flex flex-1 justify-center px-4 pt-12">
        <Molecule.FeedState
          icon={<Lock size={32} strokeWidth={1.5} />}
          title="You don’t have access."
          description="Only site admins can see the directory."
        />
      </div>
    );
  }

  return (
    <>
      <nav
        aria-label="Directory sections"
        className="flex shrink-0 items-end gap-6 border-b border-divider px-4 sm:px-8"
      >
        {tabs.map(({ value, label, icon }) => (
          <Link
            key={value}
            href={value === "users" ? "/directory" : `/directory?tab=${value}`}
            aria-current={tab === value ? "page" : undefined}
            className={`focus-ring -mb-px flex shrink-0 items-center gap-2 rounded-t-sm border-b-2 px-1 py-3 text-sm transition-colors ${
              tab === value
                ? "border-accent text-accent"
                : "border-transparent font-semibold text-foreground hover:text-accent"
            }`}
          >
            {icon}
            {label}
          </Link>
        ))}
        <div className="ml-auto self-center">
          <ViewToggle />
        </div>
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-24 sm:px-8 sm:pt-8">
        <div className="mx-auto w-full max-w-[880px]">
          {tab === "users" ? (
            <DirectoryList
              key={`users-${profile.userId}`}
              load={getDirectoryUsers}
              label="users"
              renderCard={(user, update) => (
                <UserCard
                  key={user.userId}
                  user={user}
                  onChange={profile.isHeadAdmin ? update : undefined}
                />
              )}
              renderRow={(user, update) => (
                <UserRow
                  key={user.userId}
                  user={user}
                  onChange={profile.isHeadAdmin ? update : undefined}
                />
              )}
            />
          ) : (
            <DirectoryList
              key={`communities-${profile.userId}`}
              load={getDirectoryCommunities}
              label="communities"
              renderCard={(community, update) => (
                <CommunityCardItem
                  key={community.id}
                  community={community}
                  onChange={profile.isHeadAdmin ? update : undefined}
                />
              )}
              renderRow={(community, update) => (
                <CommunityRow
                  key={community.id}
                  community={community}
                  onChange={profile.isHeadAdmin ? update : undefined}
                />
              )}
            />
          )}
        </div>
      </div>
    </>
  );
}

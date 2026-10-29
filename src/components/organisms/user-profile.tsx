"use client";

import {
  Boxes,
  CalendarDays,
  Clapperboard,
  Library,
  Lock,
  Newspaper,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { App, Tooltip } from "antd";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode, type UIEvent } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Template from "@template";
import {
  createWallPost,
  getPublicProfile,
  getUserPosts,
  removeAvatar,
  removeUserBackground,
  removeUserCover,
  setProfileVerified,
  uploadAvatar,
  uploadUserBackground,
  uploadUserCover,
  type FeedContentType,
  type Profile as OwnProfile,
  type PublicProfile as Profile,
} from "@/lib/api";
import { usePaged } from "@/lib/use-paged";
import { useTabScroller } from "@/lib/use-tab-scroller";
import { displayName } from "@/lib/display-name";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { useFriendsStore } from "@/stores/friends-store";
import { useLayoutStore } from "@/stores/layout-store";
import { MessageButton } from "./chat-dock";
import { FriendAction } from "./member-list";
import { ReportButton } from "./report-content";
import { PostComposer } from "./post-composer";
import { PostList } from "./post-list";
import { ProfileSearchScope } from "./content-search";
import { ProfileLibrary } from "./profile-library";
import { PanelHeading, SidePanel } from "./side-panel";
import { TwitchClips } from "./twitch-clips";
import { PageTour } from "./onboarding";
import { ProfileLinkedDiscussion } from "./linked-discussion";
import { PersonRow } from "./person-row";
import { VerifyToggle } from "./verify-toggle";
import { AdminToggle } from "./admin-toggle";
import type { PresenceStatus } from "@/lib/api";
import { presenceDot, presenceLabel } from "@/lib/presence";

const tabs = [
  { value: "posts", label: "Posts", icon: <Newspaper size={16} /> },
  { value: "library", label: "Library", icon: <Library size={16} /> },
  { value: "friends", label: "Friends", icon: <Users size={16} /> },
  { value: "communities", label: "Communities", icon: <Boxes size={16} /> },
  { value: "clips", label: "Clips", icon: <Clapperboard size={16} /> },
] as const;

type Tab = (typeof tabs)[number]["value"];

type Loaded = { username: string; profile: Profile | null; failed?: boolean };

type ImageEditor = {
  upload: (file: File) => Promise<unknown>;
  remove: () => Promise<unknown>;
};

type ProfileImages = { avatar: ImageEditor; cover: ImageEditor; background: ImageEditor };

const AVATAR_MAX_SIZE = 384;

function ProfileAvatar({
  profile,
  name,
  editor,
}: {
  profile: Profile;
  name: string;
  editor?: ImageEditor;
}) {
  const picture = profile.avatarUrl ? (
    <Image src={profile.avatarUrl} alt="" fill unoptimized className="rounded-full object-cover" />
  ) : (
    <span className="flex h-full w-full items-center justify-center rounded-full bg-rail-item font-display text-2xl font-bold">
      {Array.from(name)[0]?.toUpperCase()}
    </span>
  );

  if (!editor) return picture;

  return (
    <Molecule.ImageMenu
      noun="picture"
      hasImage={Boolean(profile.avatarUrl)}
      onUpload={editor.upload}
      onRemove={editor.remove}
      crop={{ aspect: 1, round: true, maxSize: AVATAR_MAX_SIZE }}
    >
      {(busy) => (
        <button
          type="button"
          aria-label="Change profile picture"
          className="focus-ring group absolute inset-0 cursor-pointer rounded-full"
        >
          {picture}
          <Atom.EditOverlay busy={busy} badge={false} />
        </button>
      )}
    </Molecule.ImageMenu>
  );
}

function ProfileHeader({
  profile,
  status,
  live = false,
  collapsed,
  actions,
  adminAction,
  social,
  images,
}: {
  profile: Profile;
  status: PresenceStatus;
  live?: boolean;
  collapsed: boolean;
  actions: React.ReactNode;
  adminAction?: React.ReactNode;
  social?: React.ReactNode;
  images?: ProfileImages;
}) {
  const name = profile.name || profile.username;
  const backdrop = profile.coverUrl ?? profile.avatarUrl;
  const header = useRef<HTMLElement>(null);

  return (
    <header
      ref={header}
      className={`relative shrink-0 overflow-hidden border-b border-divider bg-gradient-to-br from-accent-soft to-rail-item transition-[height] duration-300 ease-out motion-reduce:transition-none ${
        collapsed ? "h-14 sm:h-[72px]" : "h-52 sm:h-64"
      }`}
    >
      {backdrop && (
        <Image
          src={backdrop}
          alt=""
          fill
          unoptimized
          priority
          className={`object-cover ${profile.coverUrl ? "" : "scale-125 blur-2xl"}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-black/5" />
      <div
        className={`absolute inset-0 flex gap-3 px-4 sm:gap-4 sm:px-8 ${
          images ? "pr-28 sm:pr-32" : "pr-44 sm:pr-60"
        } ${
          collapsed ? "items-center" : "items-end pb-4 sm:pb-6"
        }`}
      >
        <span
          className={`relative shrink-0 rounded-full border-2 border-white/80 transition-[width,height] duration-300 motion-reduce:transition-none ${
            collapsed ? "h-8 w-8 sm:h-10 sm:w-10" : "h-16 w-16 sm:h-24 sm:w-24"
          }`}
        >
          <ProfileAvatar profile={profile} name={name} editor={images?.avatar} />
          <Tooltip title={presenceLabel[status]}>
            <span
              role="img"
              aria-label={presenceLabel[status]}
              className={`absolute right-[14.6%] bottom-[14.6%] translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white ${
                presenceDot[status]
              } ${collapsed ? "h-2.5 w-2.5" : "h-4 w-4"}`}
            />
          </Tooltip>
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <Atom.Heading
            className={`flex min-w-0 items-center gap-1.5 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] ${
              collapsed ? "" : "sm:text-4xl"
            }`}
          >
            <span className="truncate">{name}</span>
            {profile.isVerified && <Atom.VerifiedBadge size="heading" />}
          </Atom.Heading>
          {!collapsed && (
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-white/85">
              <span>@{profile.username}</span>
              {profile.isHeadAdmin ? (
                <Atom.RoleBadge role="head-admin" />
              ) : (
                profile.isAdmin && <Atom.RoleBadge role="site-admin" />
              )}
            </p>
          )}
          {!collapsed && social && <div className="mt-2 flex items-center gap-2">{social}</div>}
        </div>
      </div>
      <div className="pointer-events-none absolute top-2.5 right-4 left-4 flex items-start gap-2 sm:top-4 sm:right-8 sm:left-8">
        {!collapsed && profile.twitchLogin && (
          <div className="pointer-events-auto flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Molecule.StreamPill
              login={profile.twitchLogin}
              live={live}
              nextStream={profile.nextStream ?? null}
            />
          </div>
        )}
        <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-2">
          {adminAction && !collapsed && (
            <div className="flex items-center gap-1 rounded-lg bg-surface/85 p-0.5 backdrop-blur">
              {adminAction}
            </div>
          )}
          {actions && (
            <div className="flex items-center gap-1 rounded-lg bg-surface/85 p-0.5 backdrop-blur">
              {actions}
            </div>
          )}
        </div>
      </div>
      {images && !collapsed && (
        <Molecule.CoverButton
          hasImage={Boolean(profile.coverUrl)}
          aspect={() =>
            Molecule.coverAspect(header.current?.offsetWidth ?? 0, header.current?.offsetHeight ?? 0)
          }
          onUpload={images.cover.upload}
          onRemove={images.cover.remove}
          className="absolute right-4 bottom-4 sm:right-8 sm:bottom-6"
        />
      )}
    </header>
  );
}

function ProfileTabs({ profile, tab }: { profile: Profile; tab: Tab }) {
  const [tabsRef, tabsFade] = useTabScroller<HTMLElement>(tab);
  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const counts: Partial<Record<Tab, number>> = {
    library: profile.library.length,
    friends: profile.friendCount,
    communities: profile.communityCount,
  };

  return (
    <nav
      ref={tabsRef}
      style={tabsFade}
      aria-label="Profile sections"
      data-tour="profile-tabs"
      className="flex shrink-0 items-end gap-6 overflow-x-auto border-b border-divider px-4 sm:px-8"
    >
      {tabs
        .filter(({ value }) => value !== "clips" || profile.hasClips)
        .map(({ value, label, icon }) => (
          <Link
            key={value}
            href={`/users/${profile.username}${value === "posts" ? "" : `?tab=${value}`}`}
            aria-current={tab === value ? "page" : undefined}
            className={`focus-ring -mb-px flex shrink-0 items-center gap-2 rounded-t-sm border-b-2 px-1 py-3 text-sm transition-colors ${
              tab === value
                ? "border-accent text-accent"
                : "border-transparent font-semibold text-foreground hover:text-accent"
            }`}
          >
            {icon}
            {label}
            {counts[value] !== undefined && (
              <span className="text-xs font-normal text-muted">{counts[value]}</span>
            )}
          </Link>
        ))}
      <p className="ml-auto hidden shrink-0 items-center gap-1.5 self-center text-xs text-muted sm:flex">
        <CalendarDays size={14} aria-hidden />
        Joined {joined}
      </p>
    </nav>
  );
}

function WallInvite({ profile }: { profile: Profile }) {
  const { message } = App.useApp();
  const status = useFriendsStore((state) =>
    !state.loaded
      ? "unknown"
      : state.friends.some((friend) => friend.userId === profile.userId)
        ? "friend"
        : state.outgoing.some((user) => user.userId === profile.userId)
          ? "sent"
          : state.incoming.some((user) => user.userId === profile.userId)
            ? "incoming"
            : "none",
  );
  const addFriend = useFriendsStore((state) => state.addFriend);
  const [pending, setPending] = useState(false);
  const name = displayName(profile);

  if (status === "unknown" || status === "friend") return null;

  async function handleAdd() {
    setPending(true);
    try {
      await addFriend({ userId: profile.userId });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  const copy = {
    none: {
      title: `Become friends with ${name}`,
      description: `Add ${name} as a friend to post on their wall and like and comment on their posts.`,
    },
    sent: {
      title: "Friend request sent",
      description: `Once ${name} accepts, you can post on their wall and like and comment on their posts.`,
    },
    incoming: {
      title: `${name} wants to be friends`,
      description: `Accept their request to post on their wall and like and comment on their posts.`,
    },
  }[status];

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-divider bg-surface p-5 sm:p-6">
      <div>
        <h2 className="font-display text-xl font-bold">{copy.title}</h2>
        <p className="mt-1 text-sm text-muted">{copy.description}</p>
      </div>
      {status !== "sent" && (
        <div>
          <Molecule.ReadOnlyGate action="add friends">
            <Atom.Button icon={<UserPlus size={16} />} loading={pending} onClick={handleAdd}>
              {status === "incoming" ? "Accept friend request" : "Add friend"}
            </Atom.Button>
          </Molecule.ReadOnlyGate>
        </div>
      )}
    </section>
  );
}

function Wall({
  profile,
  isSelf,
  canPost,
}: {
  profile: Profile;
  isSelf: boolean;
  canPost: boolean;
}) {
  const feed = usePaged(
    useCallback(
      (token: string | null, cursor?: string, excluded?: FeedContentType[]) => getUserPosts(token, profile.username, cursor, excluded),
      [profile.username],
    ),
    { live: true, guest: true },
  );
  const name = displayName(profile);
  const signedIn = useAuthStore((state) => Boolean(state.token));

  async function handlePost(content: string, linkUrl?: string) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");
    feed.prepend(await createWallPost(token, profile.username, content, linkUrl));
  }

  return (
    <div className="flex flex-col gap-3">
      {!signedIn && (
        <section className="flex flex-col gap-4 rounded-xl border border-divider bg-surface p-5 sm:p-6">
          <div>
            <h2 className="font-display text-xl font-bold">
              Log in to connect with {name}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Log in to add {name} as a friend, post on their wall, and join the
              conversation.
            </p>
          </div>
          <div>
            <Molecule.LoginLink>Log in</Molecule.LoginLink>
          </div>
        </section>
      )}
      {signedIn && !canPost && <WallInvite profile={profile} />}
      {canPost && (
        <div data-tour="profile-wall">
          <PostComposer
            linkPreview
            onPost={handlePost}
            placeholder={isSelf ? "What’s on your mind?" : `Write something to ${name}…`}
            target={
              <div className="flex items-center gap-3">
                <Atom.Avatar size="sm" label={name} src={profile.avatarUrl} seed={profile.userId} />
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs text-muted uppercase">Post to</span>
                  <span className="truncate text-sm font-semibold">
                    {isSelf ? "Your wall" : `${name}’s wall`}
                  </span>
                </div>
              </div>
            }
          />
        </div>
      )}
      <PostList
        showCommunity
        feed={feed}
        empty={{
          title: "Nothing here yet.",
          description: isSelf
            ? "Share an update, and your posts and activity will show up here."
            : `Posts on ${name}’s wall and what they share in communities you can see show up here.`,
        }}
      />
    </div>
  );
}

function EmptyTab({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="sm:pt-8">
      <Molecule.FeedState icon={icon} title={title} description={description} />
    </div>
  );
}

function FriendsTab({ profile, myId }: { profile: Profile; myId?: number }) {
  const livePresence = useFriendsStore((state) => state.presence);
  const liveStatuses = useFriendsStore((state) => state.statuses);

  if (profile.friends.length === 0) {
    return (
      <EmptyTab
        icon={<Users size={24} strokeWidth={1.5} />}
        title="No friends yet."
        description={`${displayName(profile)} hasn’t added any friends yet.`}
      />
    );
  }

  return (
    <Molecule.TabSection title="Friends" count={profile.friends.length}>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {profile.friends.map((friend) => (
          <li key={friend.userId}>
            <Molecule.PersonCard
              userId={friend.userId}
              username={friend.username}
              label={displayName(friend)}
              avatarUrl={friend.avatarUrl}
              coverUrl={friend.coverUrl}
              isVerified={friend.isVerified}
              presence={
                (livePresence[friend.userId] ?? friend.online)
                  ? (liveStatuses[friend.userId] ?? friend.status)
                  : "offline"
              }
              action={
                myId !== undefined && (
                  <FriendAction userId={friend.userId} self={friend.userId === myId} />
                )
              }
            />
          </li>
        ))}
      </ul>
    </Molecule.TabSection>
  );
}

function CommunitiesTab({ profile }: { profile: Profile }) {
  const router = useRouter();
  const joined = useCommunityStore((state) => state.communities);
  const joinCommunity = useCommunityStore((state) => state.joinCommunity);
  const [joining, setJoining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hidden = profile.communityCount - profile.communities.length;

  async function handleJoin(communityId: number) {
    setError(null);
    setJoining(communityId);
    try {
      await joinCommunity(communityId);
      router.push(`/communities/${communityId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setJoining(null);
    }
  }

  if (profile.communities.length === 0) {
    return (
      <EmptyTab
        icon={<Boxes size={24} strokeWidth={1.5} />}
        title={hidden > 0 ? "Only private communities." : "No communities yet."}
        description={
          hidden > 0
            ? `${displayName(profile)} is only in private communities you’re not part of.`
            : `${displayName(profile)} hasn’t joined any communities yet.`
        }
      />
    );
  }

  return (
    <Molecule.TabSection title="Communities" count={profile.communityCount}>
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {profile.communities.map((community) => (
          <li key={community.id}>
            <Molecule.CommunityCard
              name={community.name}
              iconUrl={community.iconUrl}
              coverUrl={community.coverUrl}
              memberCount={community.memberCount}
              isVerified={community.isVerified}
              href={`/communities/${community.id}`}
              badge={community.isOwner ? <Atom.RoleBadge role="owner" /> : undefined}
              action={
                joined.some(({ id }) => id === community.id) ? (
                  <Atom.ButtonLink
                    href={`/communities/${community.id}`}
                    variant="secondary"
                    size="small"
                  >
                    Open
                  </Atom.ButtonLink>
                ) : (
                  <Molecule.ReadOnlyGate action="join">
                    <Atom.Button
                      size="small"
                      loading={joining === community.id}
                      disabled={joining !== null && joining !== community.id}
                      onClick={() => handleJoin(community.id)}
                    >
                      Join
                    </Atom.Button>
                  </Molecule.ReadOnlyGate>
                )
              }
            />
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="text-xs text-muted">
          Plus {hidden} private {hidden === 1 ? "community" : "communities"} you’re not part of.
        </p>
      )}
    </Molecule.TabSection>
  );
}

const PANEL_LABEL = "Friends & communities";

function SeeAll({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div onClick={() => useLayoutStore.getState().closeDrawer()}>
      <Atom.ButtonLink href={href} variant="secondary" block>
        {children}
      </Atom.ButtonLink>
    </div>
  );
}

function ProfileSidePanel({ profile }: { profile: Profile }) {
  const livePresence = useFriendsStore((state) => state.presence);
  const liveStatuses = useFriendsStore((state) => state.statuses);
  const friends = profile.friends
    .map((friend) => ({
      ...friend,
      online: livePresence[friend.userId] ?? friend.online,
      status: liveStatuses[friend.userId] ?? friend.status,
    }))
    .sort((a, b) => Number(b.online) - Number(a.online));
  const base = `/users/${profile.username}`;

  return (
    <>
      <PanelHeading title={`Friends / ${profile.friendCount}`} label={PANEL_LABEL} />
      {friends.length === 0 ? (
        <p className="-mt-3 text-xs text-muted">No friends yet.</p>
      ) : (
        <div className="-mt-3 flex flex-col gap-2">
          <ul className="flex flex-col">
            {friends.slice(0, 8).map((friend) => (
              <PersonRow
                key={friend.userId}
                person={friend}
                presence={friend.online ? friend.status : "offline"}
                playing={friend.playing}
              />
            ))}
          </ul>
          {friends.length > 8 && <SeeAll href={`${base}?tab=friends`}>See all friends</SeeAll>}
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-divider pt-6">
        <h2 className="font-display text-2xl font-bold">Communities / {profile.communityCount}</h2>
        {profile.communities.length === 0 ? (
          <p className="text-xs text-muted">
            {profile.communityCount > 0
              ? "Only in private communities you’re not part of."
              : "Hasn’t joined any communities yet."}
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {profile.communities.slice(0, 5).map((community) => (
                <li key={community.id}>
                  <Molecule.CommunityTile
                    id={community.id}
                    name={community.name}
                    iconUrl={community.iconUrl}
                    role={community.isOwner ? "owner" : "member"}
                    isVerified={community.isVerified}
                  />
                </li>
              ))}
            </ul>
            {profile.communities.length > 5 && (
              <SeeAll href={`${base}?tab=communities`}>See all communities</SeeAll>
            )}
          </>
        )}
      </div>
    </>
  );
}

export function UserProfile({ username }: { username: string }) {
  const me = useAuthStore((state) => state.profile);
  const livePresence = useFriendsStore((state) => state.presence);
  const liveStatuses = useFriendsStore((state) => state.statuses);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const isSelf = me?.username === username.toLowerCase();
  const requested = useSearchParams().get("tab");
  const tab: Tab = tabs.find(({ value }) => value === requested)?.value ?? "posts";
  const friendIds = useFriendsStore((state) => state.friends);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    getPublicProfile(token, username)
      .then((profile) => setLoaded({ username, profile }))
      .catch(() => setLoaded({ username, profile: null, failed: true }));
  }, [username]);

  function editor(
    upload: (token: string, file: File) => Promise<OwnProfile>,
    remove: (token: string) => Promise<OwnProfile>,
  ): ImageEditor {
    async function save(request: (token: string) => Promise<OwnProfile>) {
      const { token } = useAuthStore.getState();
      if (!token) throw new Error("Please log in again.");
      const updated = await request(token);
      useAuthStore.setState({ profile: updated });
      setLoaded((current) =>
        current?.profile
          ? {
              ...current,
              profile: {
                ...current.profile,
                avatarUrl: updated.avatarUrl,
                coverUrl: updated.coverUrl,
                backgroundUrl: updated.backgroundUrl,
              },
            }
          : current,
      );
    }

    return {
      upload: (file) => save((token) => upload(token, file)),
      remove: () => save(remove),
    };
  }

  async function handleVerified(isVerified: boolean) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    const verified = await setProfileVerified(token, username, isVerified);
    setLoaded((current) =>
      current?.profile
        ? { ...current, profile: { ...current.profile, isVerified: verified } }
        : current,
    );
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const room = scrollHeight - clientHeight;
    setCollapsed((current) => (current ? scrollTop > 0 : scrollTop > 32 && room > 240));
  }

  const current = loaded?.username === username ? loaded : null;

  if (!current?.profile) {
    return (
      <Template.CenteredTemplate>
        {!current ? (
          <Atom.Loader />
        ) : (
          <Molecule.FeedState
            role={current.failed ? "alert" : undefined}
            eyebrow={current.failed ? "Connection error" : "Not found"}
            icon={<UserX size={24} strokeWidth={1.5} />}
            title={current.failed ? "This profile couldn’t be loaded." : "No one goes by that name."}
            description={
              current.failed
                ? "Check your connection and try again."
                : `There’s no user called @${username}.`
            }
          />
        )}
      </Template.CenteredTemplate>
    );
  }

  const profile = current.profile;
  const images: ProfileImages | undefined = isSelf
    ? {
        avatar: editor(uploadAvatar, removeAvatar),
        cover: editor(uploadUserCover, removeUserCover),
        background: editor(uploadUserBackground, removeUserBackground),
      }
    : undefined;
  const online = isSelf
    ? !me?.appearOffline
    : (livePresence[profile.userId] ?? profile.online);
  const status: PresenceStatus = !online
    ? "offline"
    : isSelf
      ? (me?.status ?? "online")
      : (liveStatuses[profile.userId] ?? profile.status);
  const live = (liveStatuses[profile.userId] ?? profile.status) === "streaming";
  const social = !isSelf && me && (
    <>
      <MessageButton person={profile} />
      <FriendAction
        userId={profile.userId}
        self={false}
        buttonFor={displayName(profile)}
      />
    </>
  );

  if (profile.restricted) {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <ProfileHeader
          profile={profile}
          status="offline"
          collapsed={false}
          social={social}
          actions={null}
        />
        <Template.PageColumn>
          <Molecule.FeedState
            eyebrow="Private profile"
            icon={<Lock size={24} strokeWidth={1.5} />}
            title="This profile is private."
            description={
              me
                ? `Only ${displayName(profile)}’s friends can see their posts, friends, communities, and library.`
                : `Only ${displayName(profile)}’s friends can see their posts, friends, communities, and library. Log in to add them as a friend.`
            }
            action={
              !me && (
                <Molecule.LoginLink>Log in</Molecule.LoginLink>
              )
            }
          />
        </Template.PageColumn>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <ProfileSearchScope key={profile.username} profile={profile} />
      <PageTour name="profile" />
      <ProfileLinkedDiscussion username={profile.username} />
      <ProfileHeader
        profile={profile}
        status={status}
        live={live}
        collapsed={collapsed}
        images={images}
        social={social}
        adminAction={
          me?.isHeadAdmin ? (
            <>
              <VerifyToggle verified={profile.isVerified} onToggle={handleVerified} />
              {!isSelf && (
                <AdminToggle
                  username={profile.username}
                  isAdmin={profile.isAdmin}
                  onChange={(isAdmin) =>
                    setLoaded((current) =>
                      current?.profile
                        ? { ...current, profile: { ...current.profile, isAdmin } }
                        : current,
                    )
                  }
                />
              )}
            </>
          ) : null
        }
        actions={
          isSelf ? (
            <Molecule.SettingsLink href="/settings" label="Profile settings" />
          ) : (
            me && <ReportButton type="user" id={profile.userId} ownerId={profile.userId} />
          )
        }
      />
      <ProfileTabs profile={profile} tab={tab} />
      <div className="relative isolate flex min-h-0 flex-1">
        <Molecule.PageWallpaper
          src={profile.backgroundUrl}
          onUpload={images?.background.upload}
          onRemove={images?.background.remove}
        />
        <Template.PageColumn onScroll={handleScroll}>
          {tab === "library" ? (
            profile.library.length > 0 ? (
              <ProfileLibrary entries={profile.library} />
            ) : (
              <EmptyTab
                icon={<Library size={24} strokeWidth={1.5} />}
                title="Nothing on the shelf."
                description={
                  isSelf
                    ? "Public titles in your library show up here."
                    : `${displayName(profile)} hasn’t shared anything from their library yet.`
                }
              />
            )
          ) : tab === "friends" ? (
            <FriendsTab profile={profile} myId={me?.userId} />
          ) : tab === "communities" ? (
            <CommunitiesTab profile={profile} />
          ) : tab === "clips" && profile.hasClips ? (
            <TwitchClips
              key={profile.username}
              username={profile.username}
              name={displayName(profile)}
            />
          ) : (
            <Wall
              key={profile.username}
              profile={profile}
              isSelf={isSelf}
              canPost={isSelf || friendIds.some((friend) => friend.userId === profile.userId)}
            />
          )}
        </Template.PageColumn>
        <SidePanel label={PANEL_LABEL}>
          <ProfileSidePanel profile={profile} />
        </SidePanel>
      </div>
    </main>
  );
}

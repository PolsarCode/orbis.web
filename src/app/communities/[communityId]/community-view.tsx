"use client";

import { Clapperboard, Globe, Lock, MessagesSquare, Newspaper } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useState, type ReactNode, type UIEvent } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Organism from "@organism";
import * as Template from "@template";
import {
  canManage,
  getCommunity,
  type Community,
  type CommunityImage,
} from "@/lib/api";
import { useTabScroller } from "@/lib/use-tab-scroller";
import { useAuthStore } from "@/stores/auth-store";
import {
  COMMUNITY_LEFT_EVENT,
  COMMUNITY_MEMBERS_CHANGED_EVENT,
  useCommunityStore,
} from "@/stores/community-store";
import { pageTitle } from "@/lib/site-title";
import { useDocumentTitle } from "@/lib/use-document-title";

type Loaded = { id: string; community: Community | null; failed?: boolean };

const tabs = [
  { value: "feed", label: "Posts", icon: <Newspaper size={16} /> },
  { value: "forum", label: "Forum", icon: <MessagesSquare size={16} /> },
  { value: "clips", label: "Clips", icon: <Clapperboard size={16} /> },
] as const;

const pages = ["feed", "clips"] as const;

type Tab = (typeof pages)[number] | "members" | "forum";

function tabHref(communityId: number, tab: Tab) {
  const base = `/communities/${communityId}`;
  if (tab === "feed") return base;
  if (tab === "forum") return `${base}/forum`;
  return `${base}?tab=${tab}`;
}

export function CommunityView({
  members = false,
  forum,
}: {
  members?: boolean;
  forum?: ReactNode;
}) {
  const { communityId } = useParams<{ communityId: string }>();
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const requested = useSearchParams().get("tab");
  const tab: Tab = members
    ? "members"
    : forum
      ? "forum"
      : (pages.find((value) => value === requested) ?? "feed");
  const [tabsRef, tabsFade] = useTabScroller<HTMLElement>(tab);
  const [collapsed, setCollapsed] = useState(false);
  const setCommunityImage = useCommunityStore(
    (state) => state.setCommunityImage,
  );
  const joinCommunity = useCommunityStore((state) => state.joinCommunity);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleImage(image: CommunityImage, file: File | null) {
    const community = await setCommunityImage(Number(communityId), image, file);
    setLoaded({ id: communityId, community });
  }

  async function handleJoin() {
    const community = loaded?.id === communityId ? loaded.community : null;
    if (!community || community.role) return;

    setJoining(true);
    setJoinError(null);
    try {
      const joined = await joinCommunity(community.id);
      setLoaded({
        id: communityId,
        community: { ...community, ...joined, role: "member" },
      });
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : "Could not join the community.",
      );
    } finally {
      setJoining(false);
    }
  }

  function handleLeft() {
    const community = loaded?.id === communityId ? loaded.community : null;
    if (!community) return;
    if (!community.isPublic) {
      router.push("/");
      return;
    }
    setLoaded({
      id: communityId,
      community: {
        ...community,
        role: null,
        memberCount:
          community.memberCount === undefined ? undefined : Math.max(0, community.memberCount - 1),
      },
    });
  }

  function handleVerified(isVerified: boolean) {
    setLoaded((current) =>
      current?.id === communityId && current.community
        ? { ...current, community: { ...current.community, isVerified } }
        : current,
    );
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const room = scrollHeight - clientHeight;
    setCollapsed((current) =>
      current ? scrollTop > 0 : scrollTop > 32 && room > 240,
    );
  }

  const onCommunityLeft = useEffectEvent((leftId: number) => {
    if (leftId === Number(communityId)) handleLeft();
  });

  useEffect(() => {
    function left(event: Event) {
      onCommunityLeft((event as CustomEvent<number>).detail);
    }

    window.addEventListener(COMMUNITY_LEFT_EVENT, left);
    return () => window.removeEventListener(COMMUNITY_LEFT_EVENT, left);
  }, []);

  useEffect(() => {
    const { token } = useAuthStore.getState();

    getCommunity(token, communityId)
      .then((community) => setLoaded({ id: communityId, community }))
      .catch(() =>
        setLoaded({ id: communityId, community: null, failed: true }),
      );
  }, [communityId]);

  useEffect(() => {
    function changed(event: Event) {
      if ((event as CustomEvent<number>).detail !== Number(communityId)) return;
      getCommunity(useAuthStore.getState().token, communityId)
        .then((fresh) =>
          setLoaded((current) =>
            current?.id === communityId && current.community && fresh
              ? { ...current, community: { ...current.community, memberCount: fresh.memberCount } }
              : current,
          ),
        )
        .catch(() => null);
    }

    window.addEventListener(COMMUNITY_MEMBERS_CHANGED_EVENT, changed);
    return () => window.removeEventListener(COMMUNITY_MEMBERS_CHANGED_EVENT, changed);
  }, [communityId]);

  const current = loaded?.id === communityId ? loaded : null;
  useDocumentTitle(
    forum ? null : pageTitle(current?.community?.name, members ? "Members" : "Community"),
  );
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const joinPrompt =
    current?.community && !current.community.role ? (
      <Organism.JoinCommunityPrompt
        guest={!signedIn}
        banned={current.community.banned}
        description={current.community.description}
        joining={joining}
        error={joinError}
        onJoin={handleJoin}
      />
    ) : undefined;

  return (
    <Template.AppTemplate>
      {!current ? (
        <Template.CenteredTemplate>
          <Atom.Loader />
        </Template.CenteredTemplate>
      ) : current.failed ? (
        <Template.CenteredTemplate>
          <Molecule.ConnectionError onRetry={() => window.location.reload()} />
        </Template.CenteredTemplate>
      ) : !current.community ? (
        <Template.CenteredTemplate>
          <Atom.Heading>Community not found</Atom.Heading>
          <p className="text-sm text-muted">
            It doesn&apos;t exist, or it isn&apos;t public.
          </p>
        </Template.CenteredTemplate>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col">
          <Organism.CommunitySearchScope
            key={current.community.id}
            communityId={current.community.id}
            communityName={current.community.name}
          />
          <Organism.CommunityHeader
            community={current.community}
            collapsed={collapsed}
            onImage={canManage(current.community) ? handleImage : undefined}
            onVerified={handleVerified}
          />
          {!joinPrompt && <Organism.PageTour name="community" />}
          {!forum && (
            <Organism.LinkedDiscussion
              key={`linked-${current.community.id}`}
              communityId={current.community.id}
            />
          )}
          <nav
            ref={tabsRef}
            style={tabsFade}
            aria-label="Community sections"
            className="flex shrink-0 items-end gap-6 overflow-x-auto border-b border-divider px-4 sm:px-8"
          >
            {tabs
              .filter(
                ({ value }) =>
                  value !== "clips" ||
                  (current.community!.twitchLogin && current.community!.showTwitchClips !== false),
              )
              .map(({ value, label, icon }) => (
                <Link
                  key={value}
                  href={tabHref(current.community!.id, value)}
                  data-tour={value === "forum" ? "community-forum" : undefined}
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
            <p className="ml-auto hidden shrink-0 items-center gap-2 self-center text-xs text-muted sm:flex">
              {current.community.isPublic ? (
                <Globe size={14} aria-hidden />
              ) : (
                <Lock size={14} aria-hidden />
              )}
              {current.community.isPublic
                ? "Public community"
                : "Private community"}
              {current.community.memberCount !== undefined &&
                ` · ${current.community.memberCount.toLocaleString()} ${
                  current.community.memberCount === 1 ? "member" : "members"
                }`}
            </p>
          </nav>
          <div className="relative isolate flex min-h-0 flex-1">
            <Molecule.PageWallpaper
              src={current.community.backgroundUrl}
              onUpload={
                canManage(current.community)
                  ? (file) => handleImage("background", file)
                  : undefined
              }
              onRemove={
                canManage(current.community)
                  ? () => handleImage("background", null)
                  : undefined
              }
            />
            <Template.PageColumn onScroll={handleScroll}>
              {forum ? (
                <Organism.ForumProvider community={current.community} joinPrompt={joinPrompt}>
                  {forum}
                </Organism.ForumProvider>
              ) : tab === "clips" &&
              current.community.twitchLogin &&
              current.community.showTwitchClips !== false ? (
                <Organism.TwitchClips
                  key={current.community.id}
                  communityId={current.community.id}
                  name={current.community.name}
                />
              ) : tab === "members" ? (
                <Organism.MemberList
                  key={current.community.id}
                  communityId={current.community.id}
                />
              ) : (
                <Organism.CommunityFeed
                  key={`${current.community.id}-${tab}`}
                  communityId={current.community.id}
                  joinPrompt={joinPrompt}
                />
              )}
            </Template.PageColumn>
            <Organism.SidePanel label="Members">
              {!joinPrompt && (
                <div className="flex gap-2">
                  <Organism.InviteButton
                    key={`invite-${current.community.id}`}
                    community={current.community}
                  />
                  <Organism.InviteCardButton
                    key={`card-${current.community.id}`}
                    community={current.community}
                  />
                </div>
              )}
              <Organism.MemberPresence
                key={`${current.community.id}-${current.community.role ?? "visitor"}`}
                communityId={current.community.id}
                seeAllHref={`/communities/${current.community.id}/members`}
              />
            </Organism.SidePanel>
          </div>
        </main>
      )}
    </Template.AppTemplate>
  );
}

"use client";

import { Clapperboard, Globe, Lock, MessagesSquare, Newspaper } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Organism from "@organism";
import * as Template from "@template";
import { canManage, getCommunity, type CommunityImage } from "@/lib/api";
import { useCollapsingHeader } from "@/lib/use-collapsing-header";
import { useTabScroller } from "@/lib/use-tab-scroller";
import { useAuthStore } from "@/stores/auth-store";
import {
  COMMUNITY_LEFT_EVENT,
  COMMUNITY_MEMBERS_CHANGED_EVENT,
  useCommunityStore,
} from "@/stores/community-store";
import { pageTitle } from "@/lib/site-title";
import { useDocumentTitle } from "@/lib/use-document-title";
import { CommunityPageStates, type LoadedCommunity } from "./community-page";

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
  const [loaded, setLoaded] = useState<LoadedCommunity | null>(null);
  const requested = useSearchParams().get("tab");
  const tab: Tab = members
    ? "members"
    : forum
      ? "forum"
      : (pages.find((value) => value === requested) ?? "feed");
  const [tabsRef, tabsFade] = useTabScroller<HTMLElement>(tab);
  const [collapsed, handleScroll] = useCollapsingHeader();
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
    <CommunityPageStates current={current} missing="It doesn't exist, or it isn't public.">
      {(community) => (
        <main className="flex min-h-0 flex-1 flex-col">
          <Organism.CommunitySearchScope
            key={community.id}
            communityId={community.id}
            communityName={community.name}
          />
          <Organism.CommunityHeader
            community={community}
            collapsed={collapsed}
            onImage={canManage(community) ? handleImage : undefined}
            onVerified={handleVerified}
          />
          {!joinPrompt && <Organism.PageTour name="community" />}
          {!forum && (
            <Organism.LinkedDiscussion
              key={`linked-${community.id}`}
              communityId={community.id}
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
                  (community.twitchLogin && community.showTwitchClips !== false),
              )
              .map(({ value, label, icon }) => (
                <Atom.TabLink
                  key={value}
                  href={tabHref(community.id, value)}
                  data-tour={value === "forum" ? "community-forum" : undefined}
                  active={tab === value}
                  className="-mb-px"
                >
                  {icon}
                  {label}
                </Atom.TabLink>
              ))}
            <p className="ml-auto hidden shrink-0 items-center gap-2 self-center text-xs text-muted sm:flex">
              {community.isPublic ? (
                <Globe size={14} aria-hidden />
              ) : (
                <Lock size={14} aria-hidden />
              )}
              {community.isPublic
                ? "Public community"
                : "Private community"}
              {community.memberCount !== undefined &&
                ` · ${community.memberCount.toLocaleString()} ${
                  community.memberCount === 1 ? "member" : "members"
                }`}
            </p>
          </nav>
          <div className="relative isolate flex min-h-0 flex-1">
            <Molecule.PageWallpaper
              src={community.backgroundUrl}
              onUpload={
                canManage(community)
                  ? (file) => handleImage("background", file)
                  : undefined
              }
              onRemove={
                canManage(community)
                  ? () => handleImage("background", null)
                  : undefined
              }
            />
            <Template.PageColumn onScroll={handleScroll}>
              {forum ? (
                <Organism.ForumProvider community={community} joinPrompt={joinPrompt}>
                  {forum}
                </Organism.ForumProvider>
              ) : tab === "clips" &&
              community.twitchLogin &&
              community.showTwitchClips !== false ? (
                <Organism.TwitchClips
                  key={community.id}
                  communityId={community.id}
                  name={community.name}
                />
              ) : tab === "members" ? (
                <Organism.MemberList
                  key={community.id}
                  communityId={community.id}
                />
              ) : (
                <Organism.CommunityFeed
                  key={`${community.id}-${tab}`}
                  communityId={community.id}
                  joinPrompt={joinPrompt}
                />
              )}
            </Template.PageColumn>
            <Organism.SidePanel label="Members">
              {!joinPrompt && (
                <div className="flex gap-2">
                  <Organism.InviteButton
                    key={`invite-${community.id}`}
                    community={community}
                  />
                  <Organism.InviteCardButton
                    key={`card-${community.id}`}
                    community={community}
                  />
                </div>
              )}
              <Organism.MemberPresence
                key={`${community.id}-${community.role ?? "visitor"}`}
                communityId={community.id}
                seeAllHref={`/communities/${community.id}/members`}
              />
            </Organism.SidePanel>
          </div>
        </main>
      )}
    </CommunityPageStates>
  );
}

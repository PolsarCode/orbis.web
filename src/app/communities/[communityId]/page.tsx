"use client";

import {
  Clapperboard,
  Globe,
  Lock,
  Newspaper,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, type UIEvent } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Organism from "@organism";
import * as Template from "@template";
import {
  canManage,
  getCommunity,
  setCommunityVerified,
  type Community,
  type CommunityImage,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";

type Loaded = { id: string; community: Community | null; failed?: boolean };

const tabs = [
  { value: "feed", label: "Posts", icon: <Newspaper size={16} /> },
  { value: "clips", label: "Clips", icon: <Clapperboard size={16} /> },
] as const;

const pages = ["feed", "forum", "clips"] as const;

type Tab = (typeof pages)[number];

export default function CommunityPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const requested = useSearchParams().get("tab");
  const tab: Tab = pages.find((value) => value === requested) ?? "feed";
  const section = tab === "forum" ? "feed" : tab;
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

  async function handleVerified(isVerified: boolean) {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Please log in again.");

    const verified = await setCommunityVerified(token, Number(communityId), isVerified);
    setLoaded((current) =>
      current?.id === communityId && current.community
        ? { ...current, community: { ...current.community, isVerified: verified } }
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

  useEffect(() => {
    const { token } = useAuthStore.getState();

    getCommunity(token, communityId)
      .then((community) => setLoaded({ id: communityId, community }))
      .catch(() =>
        setLoaded({ id: communityId, community: null, failed: true }),
      );
  }, [communityId]);

  const current = loaded?.id === communityId ? loaded : null;
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const headAdmin = useAuthStore((state) => Boolean(state.profile?.isHeadAdmin));
  const joinPrompt =
    current?.community && !current.community.role ? (
      <Organism.JoinCommunityPrompt
        guest={!signedIn}
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
            adminAction={
              headAdmin && (
                <Organism.VerifyToggle
                  compact
                  verified={current.community.isVerified}
                  onToggle={handleVerified}
                />
              )
            }
            actions={
              current.community.role && (
                <>
                  <Molecule.SettingsLink
                    href={`/communities/${current.community.id}/me`}
                    label="Your settings"
                    icon={<UserCog size={20} />}
                  />
                  {canManage(current.community) && (
                    <span data-tour="community-settings" className="flex">
                      <Molecule.SettingsLink
                        href={`/communities/${current.community.id}/settings`}
                        label="Community settings"
                      />
                    </span>
                  )}
                </>
              )
            }
          />
          {!joinPrompt && <Organism.PageTour name="community" />}
          <Organism.LinkedDiscussion
            key={`linked-${current.community.id}`}
            communityId={current.community.id}
          />
          <nav
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
                  href={`/communities/${current.community!.id}${
                    value === "feed" ? "" : `?tab=${value}`
                  }`}
                  aria-current={section === value ? "page" : undefined}
                  className={`focus-ring -mb-px flex shrink-0 items-center gap-2 rounded-t-sm border-b-2 px-1 py-3 text-sm transition-colors ${
                    section === value
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
              {tab === "clips" &&
              current.community.twitchLogin &&
              current.community.showTwitchClips !== false ? (
                <Organism.TwitchClips
                  key={current.community.id}
                  communityId={current.community.id}
                  name={current.community.name}
                />
              ) : (
                <Organism.CommunityFeed
                  key={`${current.community.id}-${tab}`}
                  communityId={current.community.id}
                  joinPrompt={joinPrompt}
                  initialSort={tab === "forum" ? "hot" : "all"}
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
                key={current.community.id}
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

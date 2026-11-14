"use client";

import { Checkbox, Segmented } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  exploreCommunities,
  getFriendCommunities,
  type CommunitySearchResult,
  type ExplorePage,
  type ExploreSort,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { useSignOutRedirect } from "@/lib/use-sign-out-redirect";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { PageTour } from "./onboarding";

export function useJoin() {
  const router = useRouter();
  const joinCommunity = useCommunityStore((state) => state.joinCommunity);
  const [joining, setJoining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function join(communityId: number) {
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

  return { join, joining, error };
}

export function JoinAction({
  community,
  joining,
  onJoin,
}: {
  community: Pick<CommunitySearchResult, "id" | "joined">;
  joining: number | null;
  onJoin: (communityId: number) => void;
}) {
  return community.joined ? (
    <Atom.ButtonLink href={`/communities/${community.id}`} variant="secondary" size="small">
      Open
    </Atom.ButtonLink>
  ) : (
    <Molecule.ReadOnlyGate action="join">
      <Atom.Button
        size="small"
        loading={joining === community.id}
        disabled={joining !== null && joining !== community.id}
        onClick={() => onJoin(community.id)}
      >
        Join
      </Atom.Button>
    </Molecule.ReadOnlyGate>
  );
}

function mutualText({ mutuals, mutualCount }: CommunitySearchResult) {
  const names = mutuals.map(displayName);
  const others = mutualCount - names.length;
  if (others > 0) {
    return `${names.join(", ")} and ${others} other ${others === 1 ? "friend" : "friends"} are here`;
  }
  if (names.length === 1) return `${names[0]} is here`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are here`;
}

function CommunityDetails({ community }: { community: CommunitySearchResult }) {
  return (
    <div className="flex flex-col gap-3 border-t border-divider pt-3">
      <p
        className={`line-clamp-2 min-h-[2lh] text-[13px] ${community.description ? "" : "text-muted"}`}
      >
        {community.description ?? "No description yet."}
      </p>
      <div className="flex h-6 items-center gap-2 text-xs text-muted">
        {community.members.length > 0 && <Molecule.AvatarStack people={community.members} />}
        <span className="truncate">
          {community.memberCount.toLocaleString()}{" "}
          {community.memberCount === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="flex h-6 items-center gap-2 text-xs text-muted">
        {community.mutualCount > 0 ? (
          <>
            <Molecule.AvatarStack people={community.mutuals} />
            <span className="min-w-0 truncate">{mutualText(community)}</span>
          </>
        ) : (
          <span className="truncate">None of your friends are here yet.</span>
        )}
      </div>
    </div>
  );
}

const sortOptions: { label: string; value: ExploreSort }[] = [
  { label: "Popular", value: "popular" },
  { label: "Newest", value: "newest" },
];

function CommunityGrid({
  communities,
  joining,
  onJoin,
  tour,
}: {
  communities: CommunitySearchResult[];
  joining: number | null;
  onJoin: (communityId: number) => void;
  tour?: string;
}) {
  return (
    <ul data-tour={tour} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {communities.map((community) => (
        <li key={community.id}>
          <Molecule.CommunityCard
            name={community.name}
            iconUrl={community.iconUrl}
            coverUrl={community.coverUrl}
            memberCount={community.memberCount}
            isVerified={community.isVerified}
            href={`/communities/${community.id}`}
            action={<JoinAction community={community} joining={joining} onJoin={onJoin} />}
          >
            <CommunityDetails community={community} />
          </Molecule.CommunityCard>
        </li>
      ))}
    </ul>
  );
}

function FriendCommunities({
  joining,
  onJoin,
}: {
  joining: number | null;
  onJoin: (communityId: number) => void;
}) {
  const [picks, setPicks] = useState<CommunitySearchResult[]>([]);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    let ignore = false;
    getFriendCommunities(token)
      .then((found) => {
        if (!ignore) setPicks(found);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  if (picks.length === 0) return null;
  return (
    <section data-tour="explore-friends" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-2xl font-bold">Where your friends are</h3>
        <p className="text-sm text-muted">Communities your friends joined that you haven’t yet.</p>
      </div>
      <CommunityGrid communities={picks} joining={joining} onJoin={onJoin} />
    </section>
  );
}

type Loaded = ExplorePage & { key: string };

export function CommunitySearch() {
  const router = useRouter();
  useSignOutRedirect();
  const { join, joining, error } = useJoin();
  const [sort, setSort] = useState<ExploreSort>("popular");
  const [hideJoined, setHideJoined] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const key = JSON.stringify([sort, hideJoined]);
  const current = loaded?.key === key ? loaded : null;

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) {
      router.replace("/login");
      return;
    }

    let ignore = false;
    exploreCommunities(token, { sort, hideJoined, page: 1 })
      .then((page) => {
        if (ignore) return;
        setFailed(false);
        setMoreFailed(false);
        setLoaded({ ...page, key: JSON.stringify([sort, hideJoined]) });
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });

    return () => {
      ignore = true;
    };
  }, [sort, hideJoined, attempt, router]);

  async function loadMore() {
    const { token } = useAuthStore.getState();
    if (!token || !current?.nextPage || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await exploreCommunities(token, { sort, hideJoined, page: current.nextPage });
      setLoaded((previous) =>
        previous?.key === key
          ? {
              key,
              items: [
                ...previous.items,
                ...page.items.filter(({ id }) => !previous.items.some((item) => item.id === id)),
              ],
              nextPage: page.nextPage,
            }
          : previous,
      );
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const shown = current ?? loaded;
  const emptyText = hideJoined
      ? "You’ve joined every public community."
      : "No one has made a public community yet.";

  return (
    <div className="flex flex-col gap-8">
      <PageTour name="explore" />
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <FriendCommunities joining={joining} onJoin={join} />
      <section className="flex flex-col gap-3">
        <h3 className="font-display text-2xl font-bold">All communities</h3>
        <div data-tour="explore-filters" className="flex flex-wrap items-center justify-between gap-3">
          <Segmented<ExploreSort>
            aria-label="Sort communities"
            value={sort}
            onChange={setSort}
            options={sortOptions}
          />
          <Checkbox checked={hideJoined} onChange={(event) => setHideJoined(event.target.checked)}>
            Hide joined
          </Checkbox>
        </div>
        {failed && !current ? (
          <div className="py-16">
            <Molecule.ConnectionError
              onRetry={() => {
                setFailed(false);
                setAttempt((count) => count + 1);
              }}
            />
          </div>
        ) : !shown ? (
          <div className="flex py-16">
            <Atom.Loader />
          </div>
        ) : shown.items.length === 0 ? (
          <p className="py-8 text-sm text-muted">{emptyText}</p>
        ) : (
          <div className={`flex flex-col gap-4 transition-opacity ${current ? "" : "opacity-60"}`}>
            <CommunityGrid
              communities={shown.items}
              joining={joining}
              onJoin={join}
              tour="explore-communities"
            />
            {current?.nextPage &&
              (moreFailed ? (
                <Molecule.RetryAlert onRetry={loadMore}>Couldn’t load more communities.</Molecule.RetryAlert>
              ) : (
                <Atom.Button variant="secondary" loading={loadingMore} onClick={loadMore} className="self-center">
                  Show more
                </Atom.Button>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  searchCommunities,
  type CommunitySearchResult,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
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
  community: CommunitySearchResult;
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
      <p className={`text-[13px] ${community.description ? "" : "text-muted"}`}>
        {community.description ?? "No description yet."}
      </p>
      {community.members.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Molecule.AvatarStack people={community.members} />
          {community.memberCount.toLocaleString()}{" "}
          {community.memberCount === 1 ? "member" : "members"}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted">
        {community.mutualCount > 0 ? (
          <>
            <Molecule.AvatarStack people={community.mutuals} />
            <span className="min-w-0">{mutualText(community)}</span>
          </>
        ) : (
          "None of your friends are here yet."
        )}
      </div>
    </div>
  );
}

export function CommunitySearch() {
  const router = useRouter();
  const { join, joining, error } = useJoin();
  const [results, setResults] = useState<CommunitySearchResult[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) {
      router.replace("/login");
      return;
    }

    let ignore = false;
    searchCommunities(token, "")
      .then((found) => {
        if (ignore) return;
        setFailed(false);
        setResults(found);
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });

    return () => {
      ignore = true;
    };
  }, [attempt, router]);

  return (
    <div className="flex flex-col gap-8">
      <PageTour name="explore" />
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-2xl font-bold">Public communities</h3>
          {results && results.length > 0 && (
            <span className="text-xs text-muted">
              {results.length} {results.length === 1 ? "community" : "communities"}
            </span>
          )}
        </div>
        {failed && !results ? (
          <div className="py-16">
            <Molecule.ConnectionError
              onRetry={() => {
                setFailed(false);
                setAttempt((count) => count + 1);
              }}
            />
          </div>
        ) : !results ? (
          <div className="flex py-16">
            <Atom.Loader />
          </div>
        ) : results.length === 0 ? (
          <p className="py-8 text-sm text-muted">No one has made a public community yet.</p>
        ) : (
          <ul data-tour="explore-communities" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {results.map((community) => (
              <li key={community.id} className="group relative">
                <Molecule.CommunityCard
                  name={community.name}
                  iconUrl={community.iconUrl}
                  coverUrl={community.coverUrl}
                  memberCount={community.memberCount}
                  isVerified={community.isVerified}
                  href={`/communities/${community.id}`}
                  action={<JoinAction community={community} joining={joining} onJoin={join} />}
                />
                <div className="invisible absolute inset-x-0 top-0 z-20 rounded-lg opacity-0 shadow-[0_16px_32px_-16px_rgb(0_0_0/0.45)] transition-[opacity,visibility] delay-0 duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 group-hover:delay-300 motion-reduce:transition-none">
                  <Molecule.CommunityCard
                    name={community.name}
                    iconUrl={community.iconUrl}
                    coverUrl={community.coverUrl}
                    memberCount={community.memberCount}
                    isVerified={community.isVerified}
                    href={`/communities/${community.id}`}
                    action={<JoinAction community={community} joining={joining} onJoin={join} />}
                  >
                    <CommunityDetails community={community} />
                  </Molecule.CommunityCard>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

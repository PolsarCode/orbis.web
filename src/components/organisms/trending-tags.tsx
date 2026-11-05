"use client";

import { CloudOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  getFollowedTags,
  getTrendingTags,
  type TagSummary,
  type TagWindow,
  type TrendingTag,
} from "@/lib/api";
import { tagHref, tagPeople } from "@/lib/tags";
import { useAuthStore } from "@/stores/auth-store";
import { FollowTagButton } from "./tag-view";

type Loaded = {
  window: TagWindow;
  trending: TrendingTag[];
  followed: (TagSummary & { following: boolean })[];
};

export function TrendingTags() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    let ignore = false;
    Promise.all([getTrendingTags(token), getFollowedTags(token)])
      .then(([trending, followed]) => {
        if (ignore) return;
        setFailed(false);
        setLoaded({
          window: trending.window,
          trending: trending.tags,
          followed: followed.map((tag) => ({ ...tag, following: true })),
        });
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [attempt]);

  if (failed && !loaded) {
    return (
      <Molecule.FeedState
        role="alert"
        eyebrow="Connection error"
        icon={<CloudOff size={24} strokeWidth={1.5} />}
        title="Trending tags couldn’t be loaded."
        description="Check your connection and try again."
        action={<Atom.Button onClick={() => setAttempt((count) => count + 1)}>Try again</Atom.Button>}
      />
    );
  }

  if (!loaded) {
    return (
      <div role="status" className="flex justify-center py-12">
        <span className="sr-only">Loading trending tags…</span>
        <Atom.Loader />
      </div>
    );
  }

  const following = loaded.followed.filter((tag) => tag.following).length;

  return (
    <div className="flex flex-col gap-3">
      <Molecule.TabSection title="Trending">
        {loaded.trending.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing’s trending yet. Tags show up here once a few people use them in public posts,
            comments, or forum replies.
          </p>
        ) : (
          <ol className="-mx-2 flex flex-col">
            {loaded.trending.map((tag, index) => (
              <li key={tag.name}>
                <Link
                  href={tagHref(tag.name)}
                  className="focus-ring flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-rail-item"
                >
                  <span
                    aria-hidden
                    className="w-6 shrink-0 text-right font-display text-lg font-bold text-muted"
                  >
                    {index + 1}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">#{tag.display}</span>
                    <span className="text-xs text-muted">{tagPeople(tag.people, loaded.window)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Molecule.TabSection>
      <Molecule.TabSection title="Tags you follow" count={following || undefined}>
        {loaded.followed.length === 0 ? (
          <p className="text-sm text-muted">
            You don’t follow any tags yet. Open a tag and choose Follow to see its public posts in
            your feed.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {loaded.followed.map((tag) => (
              <li key={tag.name} className="flex items-center gap-3">
                <Link
                  href={tagHref(tag.name)}
                  className="focus-ring min-w-0 flex-1 truncate rounded-sm py-1.5 text-sm font-semibold transition-colors hover:text-accent"
                >
                  #{tag.display}
                </Link>
                <FollowTagButton
                  name={tag.name}
                  display={tag.display}
                  following={tag.following}
                  followingLabel="Unfollow"
                  size="small"
                  onChange={(next) =>
                    setLoaded((current) =>
                      current && {
                        ...current,
                        followed: current.followed.map((entry) =>
                          entry.name === tag.name ? { ...entry, following: next } : entry,
                        ),
                      },
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Molecule.TabSection>
    </div>
  );
}

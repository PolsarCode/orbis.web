"use client";

import { MessageCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import * as Atom from "@atom";
import {
  getPublicCommunities,
  getPublicUsers,
  getStats,
  type PublicCommunity,
  type PublicUser,
  type Stats,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";

const DURATION = 1200;
const FACES = 4;
const ICONS = 4;

const bubble =
  "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rail-item font-display text-sm font-bold ring-2 ring-surface lg:h-11 lg:w-11 lg:text-base";

function CountUp({ value }: { value: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setCurrent(value));
      return () => cancelAnimationFrame(frame);
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION, 1);
      setCurrent(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span
      className="inline-block tabular-nums"
      style={{ minWidth: `${value.toLocaleString().length}ch` }}
    >
      {current.toLocaleString()}
    </span>
  );
}

function Figure({ value, one, many }: { value: number; one: string; many: string }) {
  return (
    <span className="flex flex-col">
      <span className="font-display text-2xl leading-none font-bold text-accent lg:text-4xl">
        <CountUp value={value} />
      </span>
      <span className="text-xs text-muted lg:text-sm">{value === 1 ? one : many}</span>
    </span>
  );
}

function Stack({ more, children }: { more: number; children: ReactNode }) {
  return (
    <span aria-hidden className="flex -space-x-2 lg:-space-x-3">
      {children}
      {more > 0 && (
        <span className={`${bubble} font-sans text-[10px] font-semibold text-muted lg:text-xs`}>
          +{more}
        </span>
      )}
    </span>
  );
}

function FloatingCard({
  delay,
  className = "",
  children,
}: {
  delay: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{ animationDelay: delay } as CSSProperties}
      className={`flex items-center gap-3 rounded-2xl border border-divider bg-surface/85 py-2.5 pr-4 pl-2.5 shadow-lg backdrop-blur lg:animate-float lg:gap-4 lg:py-4 lg:pr-6 lg:pl-4 motion-reduce:animate-none ${className}`}
    >
      {children}
    </div>
  );
}

export function SiteStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [people, setPeople] = useState<PublicUser[]>([]);
  const [communities, setCommunities] = useState<PublicCommunity[]>([]);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => null);
    getPublicUsers()
      .then((results) => setPeople(results.slice(0, FACES)))
      .catch(() => null);
    getPublicCommunities()
      .then((results) => setCommunities(results.slice(0, ICONS)))
      .catch(() => null);
  }, []);

  if (!stats) return null;

  return (
    <div
      role="group"
      aria-label="Orbis in numbers"
      className="flex flex-wrap gap-2.5 lg:absolute lg:top-1/2 lg:right-8 lg:-translate-y-1/2 lg:flex-col lg:items-end lg:gap-7"
    >
      <FloatingCard delay="0s">
        {people.length > 0 && (
          <Stack more={stats.members - people.length}>
            {people.map((person) => (
              <span key={person.userId} className={bubble}>
                {person.avatarUrl ? (
                  <Image src={person.avatarUrl} alt="" fill unoptimized className="object-cover" />
                ) : (
                  Array.from(displayName(person))[0]?.toUpperCase()
                )}
              </span>
            ))}
          </Stack>
        )}
        <Figure value={stats.members} one="member" many="members" />
      </FloatingCard>
      <FloatingCard delay="-2s" className="lg:mr-24">
        {communities.length > 0 && (
          <Stack more={stats.communities - communities.length}>
            {communities.map((community) => (
              <span key={community.id} className={bubble}>
                <Atom.CommunityIcon name={community.name} src={community.iconUrl} />
              </span>
            ))}
          </Stack>
        )}
        <Figure value={stats.communities} one="community" many="communities" />
      </FloatingCard>
      <FloatingCard delay="-4s" className="lg:mr-8">
        <span aria-hidden className={`${bubble} text-accent`}>
          <MessageCircle className="h-4 w-4 lg:h-5 lg:w-5" />
        </span>
        <Figure value={stats.posts} one="post" many="posts" />
        <Figure value={stats.comments} one="comment" many="comments" />
      </FloatingCard>
    </div>
  );
}

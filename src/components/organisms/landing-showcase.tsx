"use client";

import {
  ArrowRight,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { ActivitySummary } from "./activity-card";
import { LandingReveal } from "./landing-reveal";
import {
  getPublicCommunities,
  getPublicLibraryUpdates,
  getPublicUsers,
  type PublicCommunity,
  type PublicLibraryUpdate,
  type PublicUser,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";

const PLACEHOLDERS = 6;

function LibraryUpdateSkeleton() {
  return (
    <div aria-hidden className="h-full rounded-lg border border-divider bg-surface p-4">
      <div className="flex animate-pulse items-start gap-4 motion-reduce:animate-none">
        <span className="h-9 w-9 shrink-0 rounded-full bg-rail-item" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-col">
            <span className="flex h-5 items-center">
              <span className="h-2.5 w-11/12 rounded-full bg-rail-item" />
            </span>
            <span className="flex h-5 items-center">
              <span className="h-2.5 w-3/5 rounded-full bg-rail-item" />
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-5 w-16 rounded-full bg-rail-item" />
            <span className="h-2 w-14 rounded-full bg-rail-item" />
          </span>
        </div>
        <span className="aspect-[2/3] w-12 shrink-0 rounded-md bg-rail-item" />
      </div>
    </div>
  );
}

export function LandingCommunities() {
  const [communities, setCommunities] = useState<PublicCommunity[]>();

  useEffect(() => {
    let ignore = false;
    getPublicCommunities()
      .then((results) => {
        if (!ignore) setCommunities(results);
      })
      .catch(() => {
        if (!ignore) setCommunities([]);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section id="communities" className="flex h-full flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold tracking-wide text-accent uppercase">
          Public communities
        </p>
        <h2 className="font-display text-4xl leading-[1.02] font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Find your corner.
        </h2>
        <p className="max-w-xl text-[17px] text-muted">
          A watch club, a gaming crew, a place for your favourite theories. Join
          a community or make one that feels like you.
        </p>
      </div>
      {communities === undefined ? (
        <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Loading public communities</span>
          {Array.from({ length: PLACEHOLDERS }, (_, index) => (
            <Molecule.IdentityCardSkeleton key={index} />
          ))}
        </div>
      ) : communities.length > 0 ? (
        <ul
          aria-label="Public communities"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {communities.map((community) => (
            <li key={community.id}>
              <LandingReveal>
                <Molecule.CommunityCard
                  {...community}
                  href={`/communities/${community.id}`}
                  action={
                    <span className="flex items-center gap-1 text-xs font-semibold text-accent">
                      <span className="hidden sm:inline">View community</span>
                      <ArrowRight size={14} aria-hidden />
                    </span>
                  }
                />
              </LandingReveal>
            </li>
          ))}
        </ul>
      ) : (
        <Atom.ButtonLink href="/register" variant="secondary">
          Start your community <ArrowRight size={16} aria-hidden />
        </Atom.ButtonLink>
      )}
    </section>
  );
}

export function LandingPeople() {
  const [people, setPeople] = useState<PublicUser[]>();

  useEffect(() => {
    let ignore = false;
    getPublicUsers()
      .then((results) => {
        if (!ignore) setPeople(results);
      })
      .catch(() => {
        if (!ignore) setPeople([]);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (people?.length === 0) return null;

  return (
    <section id="people" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold tracking-wide text-accent uppercase">
          People
        </p>
        <h2 className="font-display text-4xl leading-[1.02] font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Meet the regulars.
        </h2>
        <p className="max-w-xl text-[17px] text-muted">
          Who’s online and who’s been busiest lately. Open a profile to see what
          they’re into.
        </p>
      </div>
      {people === undefined ? (
        <div role="status" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <span className="sr-only">Loading public profiles</span>
          {Array.from({ length: PLACEHOLDERS }, (_, index) => (
            <Molecule.IdentityCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <ul
          aria-label="Public profiles"
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
        >
          {people.map((person) => (
            <li key={person.userId}>
              <Molecule.PersonCard
                userId={person.userId}
                username={person.username}
                label={displayName(person)}
                avatarUrl={person.avatarUrl}
                coverUrl={person.coverUrl}
                isVerified={person.isVerified}
                presence={person.online ? person.status : "offline"}
                device={person.device}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function LandingLibraryUpdates() {
  const [updates, setUpdates] = useState<PublicLibraryUpdate[]>();

  useEffect(() => {
    let ignore = false;
    getPublicLibraryUpdates()
      .then((results) => {
        if (!ignore) setUpdates(results);
      })
      .catch(() => {
        if (!ignore) setUpdates([]);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (updates?.length === 0) return null;

  return (
    <section id="library-updates" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold tracking-wide text-accent uppercase">
          Library updates
        </p>
        <h2 className="font-display text-4xl leading-[1.02] font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Fresh off the shelf.
        </h2>
        <p className="max-w-xl text-[17px] text-muted">
          What people on Orbis just started, finished, or caught up on.
        </p>
      </div>
      {updates === undefined ? (
        <div role="status" className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <span className="sr-only">Loading library updates</span>
          {Array.from({ length: PLACEHOLDERS }, (_, index) => (
            <LibraryUpdateSkeleton key={index} />
          ))}
        </div>
      ) : (
        <ul
          aria-label="Latest library updates"
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        >
          {updates.map((update) => (
            <li key={update.id}>
              <article className="h-full rounded-lg border border-divider bg-surface p-4">
                <ActivitySummary activity={update} />
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function LandingCallToAction() {
  return (
    <section
      aria-labelledby="join-orbis"
      className="relative isolate w-full overflow-hidden bg-accent-soft py-12 sm:py-16 lg:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-36 -right-24 -z-10 h-96 w-96 rounded-full border border-accent/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -bottom-48 -z-10 h-[28rem] w-[28rem] rounded-full border border-accent/15"
      />
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.15em] text-accent uppercase">
            <span aria-hidden className="h-px w-8 bg-accent" />
            There’s room for you here
          </p>
          <h2
            id="join-orbis"
            className="font-display text-6xl leading-[0.95] font-bold tracking-tight sm:text-7xl lg:text-8xl"
          >
            Pull up
            <br />
            <span className="text-accent">a chair.</span>
          </h2>
          <p className="max-w-sm text-base leading-relaxed text-muted sm:text-lg">
            Bring your favourite stories, your latest obsession, and a little
            bit of you.
          </p>
        </div>
        <div className="flex flex-col gap-6 rounded-2xl border border-divider bg-surface p-6 shadow-[0_20px_50px_-30px_rgb(0_0_0/0.25)] sm:p-8">
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"
          >
            <Users size={24} />
          </span>
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-3xl font-bold">
              Find your people on Orbis.
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              Join a public community or create a space of your own.
            </p>
          </div>
          <Atom.ButtonLink
            href="/register"
            size="large"
            icon={<ArrowRight size={18} />}
            iconPlacement="end"
            className="w-full"
          >
            Create your account
          </Atom.ButtonLink>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-5">
            <span className="text-sm text-muted">Already part of Orbis?</span>
            <Atom.ButtonLink href="/login" size="small" variant="secondary">
              Log in
            </Atom.ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

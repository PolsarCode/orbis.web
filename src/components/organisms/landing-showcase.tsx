"use client";

import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Compass,
  FolderOpen,
  Link2,
  MessageCircle,
  Moon,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  UserRound,
  Users,
  WifiOff,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { LandingReveal } from "./landing-reveal";
import {
  getPublicCommunities,
  getPublicUsers,
  type PublicCommunity,
  type PublicUser,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";

const extras: { icon: ReactNode; label: string }[] = [
  { icon: <Compass size={18} />, label: "Explore public communities" },
  { icon: <SlidersHorizontal size={18} />, label: "Feed filters and compact view" },
  { icon: <Link2 size={18} />, label: "Link previews and video embeds" },
  { icon: <FolderOpen size={18} />, label: "Folders for your communities" },
  { icon: <Moon size={18} />, label: "Light and dark themes" },
  { icon: <WifiOff size={18} />, label: "Appear offline anytime" },
  { icon: <Ticket size={18} />, label: "Feedback with ticket numbers" },
  { icon: <ShieldCheck size={18} />, label: "Owner and admin tools" },
  { icon: <Clapperboard size={18} />, label: "Twitch clips and live badges" },
  { icon: <Share2 size={18} />, label: "New posts sent to your Discord" },
];

export function LandingCommunities() {
  const [communities, setCommunities] = useState<PublicCommunity[] | null>(
    null,
  );

  useEffect(() => {
    let ignore = false;
    getPublicCommunities()
      .then((results) => {
        if (!ignore) setCommunities(results);
      })
      .catch(() => null);
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
      {communities && communities.length > 0 ? (
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
  const [people, setPeople] = useState<PublicUser[] | null>(null);

  useEffect(() => {
    let ignore = false;
    getPublicUsers()
      .then((results) => {
        if (!ignore) setPeople(results);
      })
      .catch(() => null);
    return () => {
      ignore = true;
    };
  }, []);

  if (!people || people.length === 0) return null;

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
              presence={person.online ? "online" : "offline"}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

const features = [
  {
    id: "discussions",
    icon: MessageCircle,
    label: "Feed",
    title: "Talk it out.",
    text: "Share quick updates and keep the conversation going with replies and likes.",
  },
  {
    id: "library",
    icon: BookOpen,
    label: "Library",
    title: "Track what you love.",
    text: "Keep your anime, manga, and games together. Share your progress with a community when you choose.",
  },
  {
    id: "profiles",
    icon: UserRound,
    label: "Profiles",
    title: "Make it yours.",
    text: "Choose your picture, cover, and wallpaper, and bring your interests together on your profile.",
  },
  {
    id: "friends",
    icon: Users,
    label: "Friends and notifications",
    title: "Stay in the loop.",
    text: "Find people who share your fandoms, connect with friends, and get notified when someone replies or sends you a friend request.",
  },
  {
    id: "messages",
    icon: Send,
    label: "Messages",
    title: "Keep talking.",
    text: "Chat one-on-one or start a group. New messages pop up as they arrive, and ones from strangers wait in your requests.",
  },
];

export function LandingShowcase() {
  return (
    <section
      id="features"
      aria-label="Life on Orbis"
      className="grid gap-6 md:grid-cols-2"
    >
      {features.map(({ id, icon: Icon, label, title, text }) => (
        <LandingReveal key={id} className="h-full md:last:odd:col-span-2">
          <article
            id={id}
            className="flex h-full flex-col items-start gap-4 rounded-2xl border border-divider bg-surface p-6 sm:p-9"
          >
            <Icon size={28} className="text-accent" aria-hidden />
            <p className="text-xs font-bold tracking-wide text-muted uppercase">
              {label}
            </p>
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {title}
            </h2>
            <p className="max-w-md text-base leading-relaxed text-muted">
              {text}
            </p>
          </article>
        </LandingReveal>
      ))}
    </section>
  );
}

export function LandingExtras() {
  return (
    <section
      id="also-in-orbis"
      aria-labelledby="orbis-extras"
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
            The little things, too
          </p>
          <h2
            id="orbis-extras"
            className="font-display text-4xl font-bold tracking-tight sm:text-5xl"
          >
            Also in Orbis.
          </h2>
        </div>
        <p className="max-w-sm text-base leading-relaxed text-muted">
          A few thoughtful details to help you feel at home.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {extras.map((extra) => (
          <li key={extra.label}>
            <LandingReveal className="h-full">
              <div className="group flex h-full flex-col items-start gap-3 rounded-xl border border-divider bg-surface p-4 transition-colors sm:flex-row sm:items-center sm:gap-4 sm:p-5 hover:border-accent/40 hover:bg-accent-soft/30">
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/15 bg-accent-soft text-accent"
                >
                  {extra.icon}
                </span>
                <span className="text-sm font-semibold leading-relaxed">
                  {extra.label}
                </span>
              </div>
            </LandingReveal>
          </li>
        ))}
      </ul>
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

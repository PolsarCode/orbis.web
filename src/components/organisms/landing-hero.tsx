import { ArrowDown, ArrowRight, BookOpen, Gamepad2, Tv } from "lucide-react";
import * as Atom from "@atom";
import {
  LandingCallToAction,
  LandingCommunities,
  LandingPeople,
  LandingExtras,
  LandingShowcase,
} from "./landing-showcase";
import { AnimeSpotlight } from "./anime-spotlight";
import { LandingReveal } from "./landing-reveal";
import { SiteStats } from "./site-stats";

export function LandingHero() {
  return (
    <div data-landing-page>
      <section className="relative isolate overflow-hidden">
        <AnimeSpotlight
          overlay="bg-background/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-background lg:from-30% lg:via-background/75 lg:to-transparent"
          linkClassName="absolute right-5 bottom-6 max-w-[calc(100%-2.5rem)] sm:right-8 sm:max-w-xs"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-background to-transparent" />
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-7 px-5 pt-14 pb-28 sm:px-8 sm:pt-20 lg:min-h-[620px] lg:justify-center lg:pt-16 lg:pb-24">
          <p className="flex items-center gap-2.5 text-xs font-semibold tracking-[0.16em] text-accent uppercase">
            <span aria-hidden className="h-px w-8 bg-accent" />A home for your
            fandoms
          </p>
          <h1 className="font-display text-[clamp(4rem,8vw,7rem)] leading-[0.92] font-bold tracking-tight">
            Your fandom.
            <br />
            <span className="text-accent">Your people.</span>
          </h1>
          <p className="max-w-[440px] text-base leading-relaxed text-muted sm:text-lg">
            The shows you can’t stop watching. The games you keep coming back
            to. Find the people who get it, and make a little space of your
            own.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Atom.ButtonLink
              href="/register"
              size="large"
              icon={<ArrowRight size={17} />}
              iconPlacement="end"
            >
              Find your people
            </Atom.ButtonLink>
            <a
              href="#communities"
              className="focus-ring inline-flex items-center gap-2 rounded-sm py-3 text-sm font-semibold hover:text-accent"
            >
              Take a look around <ArrowDown size={15} aria-hidden />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-divider pt-5 text-xs font-medium text-muted">
            <span className="flex items-center gap-2">
              <Tv size={15} aria-hidden />
              Anime
            </span>
            <span className="flex items-center gap-2">
              <BookOpen size={15} aria-hidden />
              Manga
            </span>
            <span className="flex items-center gap-2">
              <Gamepad2 size={15} aria-hidden />
              Games
            </span>
            <span className="text-muted">And everything in between.</span>
          </div>
        </div>
      </section>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-20 overflow-x-clip px-5 pt-10 pb-20 sm:gap-28 sm:px-8 sm:pt-16 sm:pb-28 lg:gap-32 lg:pb-32">
        <SiteStats />
        <LandingReveal>
          <LandingCommunities />
        </LandingReveal>
        <LandingReveal>
          <LandingPeople />
        </LandingReveal>
        <LandingShowcase />
        <LandingReveal>
          <LandingExtras />
        </LandingReveal>
      </div>
      <LandingReveal>
        <LandingCallToAction />
      </LandingReveal>
    </div>
  );
}

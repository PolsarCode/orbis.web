import { ArrowRight } from "lucide-react";
import * as Atom from "@atom";
import {
  LandingCallToAction,
  LandingCommunities,
  LandingPeople,
  LandingExtras,
  LandingShowcase,
} from "./landing-showcase";
import { AnimeSlideshow } from "./anime-spotlight";
import { LandingReveal } from "./landing-reveal";
import { SiteStats } from "./site-stats";

export function LandingHero() {
  return (
    <div data-landing-page>
      <section className="relative isolate flex min-h-[600px] items-end overflow-hidden lg:h-[calc(100svh-5rem)] lg:max-h-[880px] lg:min-h-[640px]">
        <AnimeSlideshow
          overlay="bg-gradient-to-t from-background from-10% via-background/55 via-45% to-transparent"
          linkClassName="absolute right-5 bottom-6 max-w-[calc(100%-2.5rem)] sm:right-8 lg:bottom-14 lg:max-w-xs"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-background/70 via-background/15 via-45% to-transparent max-sm:hidden" />
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-6 px-5 pt-40 pb-28 sm:px-8 lg:pb-14">
          <h1 className="font-display text-[clamp(3.5rem,7vw,6.5rem)] leading-[0.92] font-bold tracking-tight">
            Your fandom.
            <br />
            <span className="text-accent">Your people.</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-foreground/80 sm:text-lg">
            Anime, manga, games, and the people who love them as much as you do.
          </p>
          <Atom.ButtonLink
            href="/register"
            size="large"
            icon={<ArrowRight size={17} />}
            iconPlacement="end"
          >
            Find your people
          </Atom.ButtonLink>
          <SiteStats />
        </div>
      </section>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-20 overflow-x-clip px-5 pt-10 pb-20 sm:gap-28 sm:px-8 sm:pt-16 sm:pb-28 lg:gap-32 lg:pb-32">
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

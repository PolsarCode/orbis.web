"use client";

import type { ReactNode } from "react";
import * as Organism from "@organism";

export function AuthTemplate({ children }: { children: ReactNode }) {
  const spotlight = Organism.useAnimeSpotlight();

  return (
    <div className="relative isolate min-h-dvh">
      <Organism.AnimeBackdrop
        spotlight={spotlight}
        overlay="bg-background/85 lg:bg-transparent lg:bg-gradient-to-r lg:from-background lg:from-35% lg:via-background/80 lg:to-black/30"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-black/70 to-transparent max-lg:hidden"
      />
      <div className="mx-auto grid min-h-dvh w-full max-w-[1600px] lg:grid-cols-2">
        <main className="flex items-center justify-center px-5 py-8 sm:px-12 sm:py-12 lg:px-16">
          {children}
        </main>
        <aside className="hidden flex-col justify-end gap-4 p-10 text-white lg:flex xl:p-14">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase drop-shadow">
            A home for your fandoms
          </p>
          <h2 className="font-display text-5xl leading-[0.95] font-bold tracking-tight drop-shadow-lg xl:text-6xl">
            Your fandom.
            <br />
            Your people.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-white/85 drop-shadow">
            A place for the stories you love and the people who love them too.
          </p>
          <Organism.AnimeSpotlightLink
            spotlight={spotlight}
            className="mt-2 self-start text-foreground sm:max-w-xs"
          />
        </aside>
      </div>
    </div>
  );
}

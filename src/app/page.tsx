import { Suspense } from "react";
import * as Atom from "@atom";
import * as Organism from "@organism";
import * as Template from "@template";
import { getChangelog } from "@/lib/changelog-files";
import { landingTitle } from "@/lib/site-title";

export default function Home() {
  const latestChangelog = getChangelog()[0] ?? null;

  return (
    <Organism.GuestGate
      home={
        <Template.AppTemplate>
          <main className="flex min-h-0 flex-1 flex-col">
            <Organism.SearchScope lead="people" />
            <Template.PageHeader>
              <Atom.Heading>Home</Atom.Heading>
            </Template.PageHeader>
            <Suspense>
              <Organism.HomeView latestChangelog={latestChangelog} />
            </Suspense>
          </main>
        </Template.AppTemplate>
      }
    >
      <div className="flex flex-1 flex-col font-sans">
        <Organism.DocumentTitle title={landingTitle} guestOnly />
        <Organism.SiteHeader sticky />
        <main className="flex-1">
          <Organism.LandingHero />
        </main>
        <Organism.SiteFooter bordered={false} />
      </div>
    </Organism.GuestGate>
  );
}

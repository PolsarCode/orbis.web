import type { ReactNode } from "react";
import * as Organism from "@organism";

export function AppTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <Organism.EmailConfirmBanner />
      <div className="shrink-0 authenticated:hidden">
        <Organism.SiteHeader />
      </div>
      <div className="flex min-h-0 flex-1 authenticated:bg-rail">
        <div className="hidden authenticated:contents">
          <Organism.CommunityRailBackdrop />
          <Organism.CommunityRail />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="hidden authenticated:contents">
            <Organism.TopBar />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background transition-[border-radius] duration-300 authenticated:border-t authenticated:border-divider authenticated:sm:rounded-tl-2xl authenticated:sm:border-l [&:has(+[data-dock])]:rounded-bl-2xl [&:has(+[data-dock])]:border-b">
            {children}
          </div>
          <Organism.LibraryDock />
        </div>
        <Organism.ChatDock />
        <Organism.NotificationToasts />
        <Organism.FeedbackDock />
      </div>
    </div>
  );
}

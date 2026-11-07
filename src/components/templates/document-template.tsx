import type { ReactNode } from "react";
import * as Organism from "@organism";
import { AppTemplate } from "./app-template";

export function DocumentTemplate({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppTemplate>
      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-[720px] flex-1 px-4 py-10 sm:px-8 sm:py-14">
            <header className="flex flex-col gap-2 pb-8">
              <h1 className="font-display text-4xl leading-[1.04] font-bold sm:text-5xl">{title}</h1>
              {description && <p className="text-sm text-muted">{description}</p>}
            </header>
            {children}
          </div>
          <div className="authenticated:hidden">
            <Organism.SiteFooter />
          </div>
        </main>
        <div className="hidden authenticated:contents">
          <Organism.FriendsSidePanel />
        </div>
      </div>
    </AppTemplate>
  );
}

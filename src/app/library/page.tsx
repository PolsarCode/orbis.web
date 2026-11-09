import type { Metadata } from "next";
import { Suspense } from "react";
import * as Organism from "@organism";
import * as Template from "@template";

export const metadata: Metadata = { title: "Catalog" };

export default function LibraryPage() {
  return (
    <Template.AppTemplate>
      <main className="flex min-h-0 flex-1 flex-col">
        <Suspense>
          <Organism.LibraryView />
        </Suspense>
      </main>
    </Template.AppTemplate>
  );
}

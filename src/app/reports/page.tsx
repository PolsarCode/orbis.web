import type { Metadata } from "next";
import { Suspense } from "react";
import * as Organism from "@organism";
import * as Template from "@template";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <Template.AppTemplate>
      <main className="flex min-h-0 flex-1 flex-col">
        <Suspense>
          <Organism.ReportsView />
        </Suspense>
      </main>
    </Template.AppTemplate>
  );
}

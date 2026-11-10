import type { Metadata } from "next";
import { Suspense } from "react";
import * as Atom from "@atom";
import * as Organism from "@organism";
import * as Template from "@template";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <Template.AppTemplate>
      <main className="flex min-h-0 flex-1 flex-col">
        <Template.PageHeader>
          <Atom.Heading>Admin</Atom.Heading>
        </Template.PageHeader>
        <Suspense>
          <Organism.DirectoryView />
        </Suspense>
      </main>
    </Template.AppTemplate>
  );
}

import type { Metadata } from "next";
import * as Atom from "@atom";
import * as Organism from "@organism";
import * as Template from "@template";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <Template.AppTemplate>
      <main className="flex min-h-0 flex-1 flex-col">
        <Organism.NotificationSearchScope />
        <Template.PageHeader>
          <Atom.Heading>Notifications</Atom.Heading>
        </Template.PageHeader>
        <Organism.NotificationCenter />
      </main>
    </Template.AppTemplate>
  );
}

"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import * as Atom from "@atom";
import * as Organism from "@organism";
import * as Template from "@template";
import { inDesktopApp } from "@/lib/desktop";
import { useSignOutRedirect } from "@/lib/use-sign-out-redirect";
import { useAuthStore } from "@/stores/auth-store";

const noSubscription = () => () => {};

export default function ApplicationSettingsPage() {
  const router = useRouter();
  useSignOutRedirect();
  const profile = useAuthStore((state) => state.profile);
  const desktop = useSyncExternalStore(noSubscription, inDesktopApp, () => null);

  useEffect(() => {
    if (!useAuthStore.getState().token) router.replace("/login");
    else if (desktop === false) router.replace("/settings");
  }, [desktop, router]);

  return (
    <Template.AppTemplate>
      {desktop ? (
        <main className="flex min-h-0 flex-1 flex-col">
          <Template.PageHeader>
            <Link
              href={profile ? `/users/${profile.username}` : "/settings"}
              aria-label="Back to your profile"
              className="icon-button -ml-1.5"
            >
              <ArrowLeft size={20} />
            </Link>
            <Atom.Heading className="min-w-0 truncate">Application settings</Atom.Heading>
          </Template.PageHeader>
          <Organism.ApplicationSettings />
        </main>
      ) : (
        <Template.CenteredTemplate>
          <Atom.Loader />
        </Template.CenteredTemplate>
      )}
    </Template.AppTemplate>
  );
}

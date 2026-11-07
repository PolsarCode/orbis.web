"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Organism from "@organism";
import * as Template from "@template";
import { useAuthStore } from "@/stores/auth-store";
import { useSignOutRedirect } from "@/lib/use-sign-out-redirect";

export default function SettingsPage() {
  const router = useRouter();
  useSignOutRedirect();
  const profile = useAuthStore((state) => state.profile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!useAuthStore.getState().token) {
      router.replace("/login");
      return;
    }
    fetchProfile().catch(() => setFailed(true));
  }, [fetchProfile, router]);

  return (
    <Template.AppTemplate>
      {profile ? (
        <main className="flex min-h-0 flex-1 flex-col">
          <Template.PageHeader>
            <Link
              href={`/users/${profile.username}`}
              aria-label="Back to your profile"
              className="icon-button -ml-1.5"
            >
              <ArrowLeft size={20} />
            </Link>
            <Atom.Heading className="min-w-0 truncate">Settings</Atom.Heading>
          </Template.PageHeader>
          <Organism.ProfileSettings profile={profile} />
        </main>
      ) : (
        <Template.CenteredTemplate>
          {failed ? (
            <Molecule.ConnectionError onRetry={() => window.location.reload()} />
          ) : (
            <Atom.Loader />
          )}
        </Template.CenteredTemplate>
      )}
    </Template.AppTemplate>
  );
}

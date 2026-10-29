"use client";

import { ArrowLeft, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Organism from "@organism";
import * as Template from "@template";
import { getCommunity, type Community } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { pageTitle } from "@/lib/site-title";
import { useDocumentTitle } from "@/lib/use-document-title";

type Loaded = { id: string; community: Community | null; failed?: boolean };

export default function CommunityMemberSettingsPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saves, setSaves] = useState(0);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) {
      router.replace("/login");
      return;
    }

    getCommunity(token, communityId)
      .then((community) => setLoaded({ id: communityId, community }))
      .catch(() =>
        setLoaded({ id: communityId, community: null, failed: true }),
      );
  }, [communityId, router]);

  const current = loaded?.id === communityId ? loaded : null;
  useDocumentTitle(pageTitle(current?.community?.name, "Your settings"));

  return (
    <Template.AppTemplate>
      {!current ? (
        <Template.CenteredTemplate>
          <Atom.Loader />
        </Template.CenteredTemplate>
      ) : current.failed ? (
        <Template.CenteredTemplate>
          <Molecule.ConnectionError onRetry={() => window.location.reload()} />
        </Template.CenteredTemplate>
      ) : !current.community ? (
        <Template.CenteredTemplate>
          <Atom.Heading>Community not found</Atom.Heading>
          <p className="text-sm text-muted">
            It doesn&apos;t exist, or you&apos;re not a member.
          </p>
        </Template.CenteredTemplate>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col">
          <Template.PageHeader>
            <Link
              href={`/communities/${current.community.id}`}
              aria-label={`Back to ${current.community.name}`}
              className="icon-button -ml-1.5"
            >
              <ArrowLeft size={20} />
            </Link>
            <Atom.Heading className="min-w-0 truncate">Your settings</Atom.Heading>
          </Template.PageHeader>
          {current.community.role ? (
            <Organism.CommunityMemberSettings
              key={current.community.id}
              community={current.community}
              onSaved={() => setSaves((count) => count + 1)}
              aside={
                <Organism.SidePanel label="Members">
                  <Organism.MemberPresence
                    key={`${current.community.id}-${saves}`}
                    communityId={current.community.id}
                  />
                </Organism.SidePanel>
              }
            />
          ) : (
          <div className="flex min-h-0 flex-1">
            <Template.PageColumn>
                <div className="flex flex-col gap-4 sm:pt-12">
                  <Molecule.FeedState
                    icon={<UserRound size={32} strokeWidth={1.5} />}
                    title="Join to set this up."
                    description={`Your settings for ${current.community.name} are available once you’re a member.`}
                    action={
                      <Atom.ButtonLink
                        href={`/communities/${current.community.id}`}
                      >
                        Back to community
                      </Atom.ButtonLink>
                    }
                  />
                </div>
            </Template.PageColumn>
            <Organism.SidePanel label="Members">
              <Organism.MemberPresence
                key={`${current.community.id}-${saves}`}
                communityId={current.community.id}
              />
            </Organism.SidePanel>
          </div>
          )}
        </main>
      )}
    </Template.AppTemplate>
  );
}

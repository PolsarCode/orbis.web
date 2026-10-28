"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Organism from "@organism";
import * as Template from "@template";
import { getCommunity, type Community } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

type Loaded = { id: string; community: Community | null; failed?: boolean };

export default function CommunityMembersPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();

    getCommunity(token, communityId)
      .then((community) => setLoaded({ id: communityId, community }))
      .catch(() =>
        setLoaded({ id: communityId, community: null, failed: true }),
      );
  }, [communityId]);

  const current = loaded?.id === communityId ? loaded : null;

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
            It doesn&apos;t exist, or it isn&apos;t public.
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
            <Atom.Heading className="min-w-0 truncate">Members</Atom.Heading>
          </Template.PageHeader>
          <div className="flex min-h-0 flex-1">
            <Template.PageColumn>
              <Organism.MemberList
                key={current.community.id}
                communityId={current.community.id}
              />
            </Template.PageColumn>
          </div>
        </main>
      )}
    </Template.AppTemplate>
  );
}

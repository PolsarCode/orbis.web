"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Template from "@template";
import { getCommunity, type Community } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { pageTitle } from "@/lib/site-title";
import { useDocumentTitle } from "@/lib/use-document-title";
import { useSignOutRedirect } from "@/lib/use-sign-out-redirect";

export type LoadedCommunity = { id: string; community: Community | null; failed?: boolean };

export function CommunityPageStates({
  current,
  missing,
  children,
}: {
  current: LoadedCommunity | null;
  missing: string;
  children: (community: Community) => ReactNode;
}) {
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
          <p className="text-sm text-muted">{missing}</p>
        </Template.CenteredTemplate>
      ) : (
        children(current.community)
      )}
    </Template.AppTemplate>
  );
}

export function CommunitySubpage({
  title,
  heading,
  children,
}: {
  title: string;
  heading: string;
  children: (community: Community) => ReactNode;
}) {
  const { communityId } = useParams<{ communityId: string }>();
  const router = useRouter();
  useSignOutRedirect();
  const [loaded, setLoaded] = useState<LoadedCommunity | null>(null);

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
  useDocumentTitle(pageTitle(current?.community?.name, title));

  return (
    <CommunityPageStates current={current} missing="It doesn't exist, or you're not a member.">
      {(community) => (
        <main className="flex min-h-0 flex-1 flex-col">
          <Template.PageHeader>
            <Link
              href={`/communities/${community.id}`}
              aria-label={`Back to ${community.name}`}
              className="icon-button -ml-1.5"
            >
              <ArrowLeft size={20} />
            </Link>
            <Atom.Heading className="min-w-0 truncate">{heading}</Atom.Heading>
          </Template.PageHeader>
          {children(community)}
        </main>
      )}
    </CommunityPageStates>
  );
}

export function CommunityLockedState({
  community,
  icon,
  title,
  description,
  note,
  aside,
}: {
  community: Community;
  icon: ReactNode;
  title: string;
  description: string;
  note?: string;
  aside: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <Template.PageColumn>
        <div className="flex flex-col gap-4 sm:pt-12">
          <Molecule.FeedState
            icon={icon}
            title={title}
            description={description}
            action={
              <Atom.ButtonLink href={`/communities/${community.id}`}>
                Back to community
              </Atom.ButtonLink>
            }
          />
          {note && <p className="border-t border-divider pt-4 text-xs text-muted">{note}</p>}
        </div>
      </Template.PageColumn>
      {aside}
    </div>
  );
}

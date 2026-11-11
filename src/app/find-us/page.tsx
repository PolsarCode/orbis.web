import type { Metadata } from "next";
import * as Atom from "@atom";
import * as Template from "@template";
import { OAuthConnectionRow } from "@/components/organisms/oauth-buttons";
import { getStats } from "@/lib/api";
import { FACEBOOK_PAGE_URL } from "@/lib/links";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Find us",
  description: "Where to follow Orbis outside the app.",
};

const links = [
  {
    provider: "facebook",
    label: "Facebook",
    description: "Weekly charts, updates, and news",
    href: FACEBOOK_PAGE_URL,
  },
] as const;

function followerLabel(followers: number) {
  return `${followers.toLocaleString("en-US")} ${followers === 1 ? "follower" : "followers"}`;
}

export default async function FindUsPage() {
  const followers = await getStats().then(
    ({ facebookFollowers }) => facebookFollowers,
    () => null,
  );

  return (
    <Template.LegalTemplate title="Find us" updated="November 10, 2026">
      <p>
        Follow Orbis for the weekly anime, manga, and games charts, new features, and news about
        the app.
      </p>
      <div className="flex flex-col gap-4">
        {links.map((link) => (
          <OAuthConnectionRow
            key={link.href}
            provider={link.provider}
            title={link.label}
            status={
              link.provider === "facebook" && typeof followers === "number"
                ? `${link.description} · ${followerLabel(followers)}`
                : link.description
            }
          >
            <Atom.Button
              size="small"
              variant="secondary"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow
            </Atom.Button>
          </OAuthConnectionRow>
        ))}
      </div>
    </Template.LegalTemplate>
  );
}

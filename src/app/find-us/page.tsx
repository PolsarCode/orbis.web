import type { Metadata } from "next";
import * as Atom from "@atom";
import * as Template from "@template";
import { OAuthConnectionRow } from "@/components/organisms/oauth-buttons";

export const metadata: Metadata = {
  title: "Find us",
  description: "Where to follow Orbis outside the app.",
};

const links = [
  {
    provider: "facebook",
    label: "Facebook",
    description: "Weekly charts, updates, and news",
    href: "https://www.facebook.com/profile.php?id=61596068415501",
  },
] as const;

export default function FindUsPage() {
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
            status={link.description}
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

import type { Metadata } from "next";
import Link from "next/link";
import * as Template from "@template";

export const metadata: Metadata = {
  title: "Community guidelines",
  description: "The rules every member agrees to follow on Orbis.",
};

export default function GuidelinesPage() {
  return (
    <Template.LegalTemplate
      title="Community guidelines"
      updated="October 29, 2026"
    >
      <p>
        Orbis is made up of many independent communities. Each one can set its
        own rules, but these guidelines apply everywhere on Orbis. By using
        Orbis, you agree to follow them.
      </p>

      <h2>Be respectful</h2>
      <ul>
        <li>
          Treat other members with courtesy, even when you disagree. Criticize
          ideas, not people.
        </li>
        <li>
          Do not harass, bully, threaten, or intimidate anyone, and do not
          encourage others to do so.
        </li>
        <li>
          Do not post hateful content that attacks people based on race,
          ethnicity, national origin, religion, gender, gender identity, sexual
          orientation, disability, or age.
        </li>
      </ul>

      <h2>Keep it safe</h2>
      <ul>
        <li>
          Do not post violent threats or content that promotes self-harm,
          terrorism, or violent extremism.
        </li>
        <li>
          Do not post sexual content involving minors under any circumstances.
          We remove it and report it to the appropriate authorities.
        </li>
        <li>
          Do not share anyone&apos;s private information, such as their
          address, phone number, or identification documents, without their
          consent.
        </li>
        <li>
          Do not impersonate other people, communities, or organizations in a
          way that is misleading.
        </li>
      </ul>

      <h2>Keep it genuine</h2>
      <ul>
        <li>
          Do not post spam, including repetitive messages, unsolicited
          advertising, or links meant to mislead.
        </li>
        <li>
          Do not manipulate likes, create accounts to evade a ban, or use
          automated tools to post or interact on Orbis.
        </li>
        <li>
          Mark spoilers clearly when a community asks you to, and keep
          discussions on topic for the community you are posting in.
        </li>
      </ul>

      <h2>Respect creators</h2>
      <ul>
        <li>
          Only post content you created or have permission to share. Credit
          artists and creators when you share their work.
        </li>
        <li>
          Do not share pirated material or links to unauthorized copies of
          copyrighted works.
        </li>
      </ul>

      <h2>Running a community</h2>
      <p>
        Community owners and admins are responsible for moderating their
        communities. They may set additional rules, remove content that breaks
        those rules, and manage who can take part. Community rules may be
        stricter than these guidelines, but never more permissive.
      </p>

      <h2>Enforcement</h2>
      <p>
        If you break these guidelines, we may remove your content, restrict
        features, or suspend or terminate your account, depending on how
        serious and repeated the violation is. Communities that repeatedly
        allow violations may be restricted or removed.
      </p>
      <p>
        These guidelines work alongside our{" "}
        <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>. We may update them over
        time, and the date at the top of this page shows when they last
        changed.
      </p>
    </Template.LegalTemplate>
  );
}

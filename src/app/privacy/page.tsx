import type { Metadata } from "next";
import Link from "next/link";
import * as Template from "@template";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What information Orbis collects and how it is used.",
};

export default function PrivacyPage() {
  return (
    <Template.LegalTemplate title="Privacy policy" updated="November 7, 2026">
      <p>
        This policy explains what information Orbis collects when you use the
        service, how we use it, and the choices you have. We collect only what
        we need to run Orbis.
      </p>

      <h2>Information you give us</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your email address, username, and
          password. Passwords are stored as a secure hash, never in plain text.
        </li>
        <li>
          <strong>Content:</strong> the posts, comments, and likes you create,
          and the communities you create or join.
        </li>
        <li>
          <strong>Connections:</strong> your friend requests and friendships.
        </li>
        <li>
          <strong>Preferences:</strong> settings such as your theme and whether
          you appear offline.
        </li>
      </ul>

      <h2>Information collected automatically</h2>
      <ul>
        <li>
          <strong>Online status:</strong> while you have Orbis open, we keep
          track of whether you are connected so we can show your friends that
          you are online. You can turn this off with the &quot;Appear
          offline&quot; setting.
        </li>
        <li>
          <strong>Technical information:</strong> like most websites, our
          servers may log basic request information, such as your IP address,
          browser type, and the time of the request, to keep the service secure
          and working.
        </li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To create and secure your account and keep you signed in.</li>
        <li>
          To show your content to the communities you post in and to show your
          online status to your friends.
        </li>
        <li>To remember your preferences.</li>
        <li>
          To prevent abuse, enforce our{" "}
          <Link href="/guidelines">Community guidelines</Link>, and comply with
          the law.
        </li>
      </ul>
      <p>
        We do not sell your personal information, and we do not use it for
        advertising.
      </p>

      <h2>Who can see your information</h2>
      <ul>
        <li>
          Your username and display name are visible to other members.
        </li>
        <li>
          Content you post in a public community can be seen by any signed-in
          member. Content in a private community can be seen by its members.
        </li>
        <li>Your online status is visible only to your accepted friends.</li>
        <li>Your email address is never shown to other members.</li>
      </ul>

      <h2>Storage in your browser</h2>
      <p>
        Orbis stores a sign-in token and your theme preference in your
        browser&apos;s local storage so you stay signed in and the site looks
        the way you chose. We do not use advertising or tracking cookies.
        Signing out removes the sign-in token.
      </p>

      <h2>Keeping and deleting your information</h2>
      <p>
        We keep your information for as long as your account exists. When a
        community is deleted, its posts, comments, and memberships are
        deleted with it.
      </p>
      <p>
        You can delete your account yourself in{" "}
        <Link href="/settings?tab=data">Settings, under Your data</Link>.
        Once you confirm, you are signed out everywhere, and your profile,
        posts, and comments are hidden from other members. We delete your
        account for good 30 days later. If you sign in before then, the
        deletion is cancelled and everything comes back as it was.
      </p>
      <p>When your account is deleted:</p>
      <ul>
        <li>
          <strong>Your content</strong> is deleted: your posts, reposts,
          comments, forum threads and posts, and the messages you sent. What
          was left on your content goes with it: posts other people left on
          your profile, comments on your posts and library updates, and replies
          in forum threads you started. Replies other people left on your
          comments stay, shown under a &quot;Comment deleted&quot; placeholder.
        </li>
        <li>
          <strong>Direct chats</strong> stay with the other person. Only your
          messages are removed, and you are shown as &quot;Deleted
          account&quot;.
        </li>
        <li>
          <strong>Your activity</strong> is deleted: your library, likes,
          bookmarks, friends and friend requests, blocks and mutes,
          notifications, the reports you filed, the hashtags you follow, your
          Steam data, and the images you uploaded.
        </li>
        <li>
          <strong>Communities you own</strong> pass to their longest-serving
          admin. A community with no admins is deleted, along with everything
          in it. Group chats you own pass to another member, or are deleted if
          no one else is left.
        </li>
        <li>
          <strong>Linked accounts</strong> such as Discord, Twitch, and Steam
          are disconnected, and the links and tokens we stored for them are
          deleted.
        </li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>Update your preferences at any time from your profile.</li>
        <li>Remove friends or decline friend requests whenever you want.</li>
        <li>
          Download a copy of your information as a file, or delete your
          account, from{" "}
          <Link href="/settings?tab=data">Settings, under Your data</Link>.
          The download includes your profile and settings, posts, comments,
          forum threads and posts, the messages you sent, your library, your
          friends, and your communities.
        </li>
        <li>
          Ask us to correct information you cannot change yourself by
          contacting the Orbis team.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        Orbis is not intended for children under 13, and we do not knowingly
        collect information from them. If you believe a child under 13 has
        created an account, contact us and we will delete it.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. When we do, we will change
        the date at the top of this page. If the changes are significant, we
        will let you know through Orbis.
      </p>
    </Template.LegalTemplate>
  );
}

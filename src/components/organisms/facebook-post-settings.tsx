"use client";

import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  getFacebookPosts,
  postFacebookPostNow,
  updateFacebookPost,
  type FacebookPostKind,
  type FacebookPostsStatus,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { FacebookAutoPost, FacebookNotSetUp } from "./website-settings";

type PostCopy = {
  label: string;
  description: string;
  confirmTitle: string;
  confirmDescription: string;
  postedMessage: string;
};

const copy: Record<FacebookPostKind, PostCopy> = {
  cover: {
    label: "Change the Page cover every Monday",
    description:
      "Shows the top 3 trending anime, manga and games from the new weekly charts. The cover changes quietly, without a post or a notification.",
    confirmTitle: "Change the Page cover now?",
    confirmDescription:
      "Sets the top 3 trending anime, manga and games from this week’s charts as the Facebook Page cover.",
    postedMessage: "Changed the Facebook Page cover.",
  },
  spotlight: {
    label: "Spotlight on Tuesdays",
    description:
      "One title from this week’s charts with its synopsis. Takes turns between anime, manga and games.",
    confirmTitle: "Post a spotlight to Facebook now?",
    confirmDescription: "Posts one title from this week’s charts to the Orbis Facebook Page.",
    postedMessage: "Posted the spotlight to Facebook.",
  },
  debate: {
    label: "Join the debate on Wednesdays",
    description: "The weekly chart with the most comments, once it has at least 3.",
    confirmTitle: "Post the debate to Facebook now?",
    confirmDescription:
      "Posts this week’s chart with the most comments, if one has at least 3.",
    postedMessage: "Posted the debate to Facebook.",
  },
  "most-added": {
    label: "Most added on Thursdays",
    description:
      "The 5 titles members added most in the last 7 days. Takes turns between anime, manga and games.",
    confirmTitle: "Post the most added titles to Facebook now?",
    confirmDescription: "Posts the 5 titles members added most in the last 7 days.",
    postedMessage: "Posted the most added titles to Facebook.",
  },
  hashtags: {
    label: "Trending hashtags on Fridays",
    description: "The top hashtags in public posts from the last 7 days.",
    confirmTitle: "Post the trending hashtags to Facebook now?",
    confirmDescription: "Posts the top hashtags in public posts from the last 7 days.",
    postedMessage: "Posted the trending hashtags to Facebook.",
  },
  community: {
    label: "Community of the week on Saturdays",
    description:
      "The public community that gained the most members in the last 7 days. The same community isn’t picked again within 8 weeks.",
    confirmTitle: "Post the community of the week to Facebook now?",
    confirmDescription:
      "Posts the public community that gained the most members in the last 7 days.",
    postedMessage: "Posted the community of the week to Facebook.",
  },
  tip: {
    label: "Tip of the week on Sundays",
    description: "The next Orbis tip, in order.",
    confirmTitle: "Post the tip of the week to Facebook now?",
    confirmDescription: "Posts the next Orbis tip to the Orbis Facebook Page.",
    postedMessage: "Posted the tip of the week to Facebook.",
  },
  season: {
    label: "Season lineup",
    description:
      "This season’s anime, manga and games, on the first three days of each season.",
    confirmTitle: "Post this season’s lineup to Facebook now?",
    confirmDescription: "Posts this season’s anime, manga and games lineups.",
    postedMessage: "Posted this season’s lineup to Facebook.",
  },
  coming: {
    label: "Coming next season",
    description: "Next season’s anime and games, two weeks before it starts.",
    confirmTitle: "Post next season’s lineup to Facebook now?",
    confirmDescription: "Posts next season’s anime and games.",
    postedMessage: "Posted next season’s lineup to Facebook.",
  },
};

const sections: { title: string; description: string; kinds: FacebookPostKind[] }[] = [
  {
    title: "Page cover",
    description: "The cover photo at the top of the Orbis Facebook Page.",
    kinds: ["cover"],
  },
  {
    title: "Weekly posts",
    description:
      "A different post each day of the week on the Orbis Facebook Page. Posts go out at 12:00 PM Philippine time.",
    kinds: ["spotlight", "debate", "most-added", "hashtags", "community", "tip"],
  },
  {
    title: "Seasonal posts",
    description: "Posts about each new season on the Orbis Facebook Page.",
    kinds: ["season", "coming"],
  },
];

const DESCRIPTION = "Automatic posts and Page cover changes on the Orbis Facebook Page.";

function AutoPost({
  kind,
  status,
  onChange,
}: {
  kind: FacebookPostKind;
  status: FacebookPostsStatus;
  onChange: (status: FacebookPostsStatus) => void;
}) {
  const post = status.posts.find((item) => item.kind === kind);
  const lastPost = post?.lastPost ?? null;
  const { label, description, confirmTitle, confirmDescription, postedMessage } = copy[kind];

  return (
    <FacebookAutoPost
      switches={[
        {
          key: kind,
          label,
          description,
          enabled: post?.enabled ?? false,
          update: (token: string, enabled: boolean) => updateFacebookPost(token, kind, enabled),
        },
      ]}
      lastPost={kind === "cover" && lastPost ? { ...lastPost, postId: null } : lastPost}
      noPost={kind === "cover" ? "The cover hasn’t been changed yet." : "No post yet."}
      confirmTitle={confirmTitle}
      confirmDescription={confirmDescription}
      postedMessage={postedMessage}
      post={(token) => postFacebookPostNow(token, kind)}
      load={getFacebookPosts}
      onChange={onChange}
    />
  );
}

export function FacebookPostSettings() {
  const [status, setStatus] = useState<FacebookPostsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getFacebookPosts(token)
      .then(setStatus)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error || !status || !status.configured) {
    return (
      <Molecule.SettingsSection title="Auto posts" description={DESCRIPTION}>
        {error ? (
          <Atom.ErrorMessage>{error}</Atom.ErrorMessage>
        ) : !status ? (
          <Atom.Loader />
        ) : (
          <FacebookNotSetUp />
        )}
      </Molecule.SettingsSection>
    );
  }

  return (
    <>
      {sections.map(({ title, description, kinds }) => (
        <Molecule.SettingsSection key={title} title={title} description={description}>
          <div className="flex flex-col divide-y divide-divider">
            {kinds.map((kind) => (
              <div key={kind} className="flex flex-col gap-5 py-6 first:pt-0 last:pb-0">
                <AutoPost kind={kind} status={status} onChange={setStatus} />
              </div>
            ))}
          </div>
        </Molecule.SettingsSection>
      ))}
    </>
  );
}

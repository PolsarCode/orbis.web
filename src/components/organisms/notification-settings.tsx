"use client";

import { App, Switch } from "antd";
import { useSyncExternalStore } from "react";
import * as Molecule from "@molecule";
import { updatePreferences, type NotificationType } from "@/lib/api";
import { inDesktopApp } from "@/lib/desktop";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationPreferencesStore } from "@/stores/notification-preferences-store";

type NotificationGroup = { label: string; description: string; types: NotificationType[] };

const sections: { title: string; description?: string; groups: NotificationGroup[] }[] = [
  {
    title: "Catalog",
    description: "About the titles in your library. They arrive the next time you open Orbis.",
    groups: [
      {
        label: "New episodes",
        description: "When a new episode of an anime you’re watching airs.",
        types: ["episode_aired"],
      },
      {
        label: "Game releases",
        description: "When a game you plan to play comes out.",
        types: ["game_released"],
      },
      {
        label: "Release dates",
        description: "When a game you plan to play gets an exact release date, or its date changes.",
        types: ["game_date"],
      },
    ],
  },
  {
    title: "Posts and comments",
    groups: [
      {
        label: "Comments",
        description: "When someone comments on your posts or library updates.",
        types: ["post_comment"],
      },
      {
        label: "Replies",
        description: "When someone replies to your comment.",
        types: ["comment_reply"],
      },
      {
        label: "Mentions",
        description: "When someone mentions you in a post or comment.",
        types: ["mention"],
      },
      {
        label: "Wall posts",
        description: "When someone posts on your wall.",
        types: ["wall_post"],
      },
      {
        label: "Forum replies and quotes",
        description: "When someone replies to your thread or quotes your forum post.",
        types: ["forum_reply", "forum_quote"],
      },
      {
        label: "Reposts and quotes",
        description: "When someone reposts or quotes your post or library update.",
        types: ["repost", "quote"],
      },
    ],
  },
  {
    title: "Friends",
    groups: [
      {
        label: "Friend requests",
        description: "When someone sends you a friend request or accepts yours.",
        types: ["friend_request", "friend_accepted"],
      },
    ],
  },
];

function GroupSwitch({ group }: { group: NotificationGroup }) {
  const { message } = App.useApp();
  const profile = useAuthStore((state) => state.profile);
  const muted = profile?.mutedNotifications ?? [];
  const enabled = !group.types.every((type) => muted.includes(type));

  async function handleChange(next: boolean) {
    const { token, profile: current } = useAuthStore.getState();
    if (!token || !current) return;
    const others = (current.mutedNotifications ?? []).filter((type) => !group.types.includes(type));
    const mutedNotifications = next ? others : [...others, ...group.types];

    useAuthStore.setState({ profile: { ...current, mutedNotifications } });
    try {
      await updatePreferences(token, { mutedNotifications });
    } catch {
      useAuthStore.setState({ profile: current });
      message.error("Couldn’t change this setting. Please try again.");
    }
  }

  return (
    <Switch aria-label={group.label} checked={enabled} disabled={!profile} onChange={handleChange} />
  );
}

const subscribeToNothing = () => () => {};

function DeviceSettings() {
  const toasts = useNotificationPreferencesStore((state) => state.toasts);
  const desktop = useNotificationPreferencesStore((state) => state.desktop);
  const setToasts = useNotificationPreferencesStore((state) => state.setToasts);
  const setDesktop = useNotificationPreferencesStore((state) => state.setDesktop);
  const desktopApp = useSyncExternalStore(subscribeToNothing, inDesktopApp, () => false);

  return (
    <Molecule.SettingsSection
      title="On this device"
      description="These only change how notifications show up here. They still appear under the bell."
    >
      <Molecule.SettingsRow
        label="Pop-up notifications"
        description="Show new notifications in the corner of the screen for a few seconds."
      >
        <Switch aria-label="Pop-up notifications" checked={toasts} onChange={setToasts} />
      </Molecule.SettingsRow>
      {desktopApp && (
        <Molecule.SettingsRow
          label="Desktop notifications"
          description="Show notifications from your computer, and bounce the app icon, while Orbis isn’t in focus."
        >
          <Switch aria-label="Desktop notifications" checked={desktop} onChange={setDesktop} />
        </Molecule.SettingsRow>
      )}
    </Molecule.SettingsSection>
  );
}

export function NotificationSettings() {
  return (
    <>
      {sections.map((section) => (
        <Molecule.SettingsSection
          key={section.title}
          title={section.title}
          description={section.description}
        >
          {section.groups.map((group) => (
            <Molecule.SettingsRow key={group.label} label={group.label} description={group.description}>
              <GroupSwitch group={group} />
            </Molecule.SettingsRow>
          ))}
        </Molecule.SettingsSection>
      ))}
      <DeviceSettings />
      <Molecule.SettingsSection title="Moderation">
        <Molecule.SettingsRow
          label="Report updates"
          description="Updates about reports you sent or were assigned to. These are always on, so nothing about your safety is missed."
        >
          <Switch aria-label="Report updates" checked disabled />
        </Molecule.SettingsRow>
      </Molecule.SettingsSection>
    </>
  );
}

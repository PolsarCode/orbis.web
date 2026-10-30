"use client";

import { App } from "antd";
import {
  CircleCheck,
  Link2,
  Lock,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import type { Profile } from "@/lib/api";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { AppearOfflineSwitch } from "./appear-offline-switch";
import { OAuthConnections } from "./oauth-connections";
import { ChangelogSwitch } from "./changelog-switch";
import { ResendConfirmation } from "./email-confirmation";
import { NsfwSwitch } from "./nsfw-switch";
import { FriendsPanel } from "./friends-panel";
import { PrivateProfileSwitch } from "./private-profile-switch";
import { SettingsTabs } from "./settings-tabs";
import { SidePanel } from "./side-panel";
import { SteamConnection } from "./steam-connection";
import { ThemeToggle } from "./theme-toggle";
import { TwoFactorSettings } from "./two-factor-settings";

function RestartTours() {
  const { message } = App.useApp();
  const resetTours = useOnboardingStore((state) => state.resetTours);
  const [pending, setPending] = useState(false);

  async function restart() {
    setPending(true);
    try {
      await resetTours();
      message.success("Tours restarted. They’ll show again as you visit each page.");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Atom.Button
      variant="secondary"
      icon={<RotateCcw size={14} />}
      loading={pending}
      onClick={restart}
      className="w-fit"
    >
      Restart tours
    </Atom.Button>
  );
}

export function ProfileSettings({ profile }: { profile: Profile }) {
  return (
    <SettingsTabs
      label="Settings sections"
      aside={
        <SidePanel label="Friends">
          <FriendsPanel />
        </SidePanel>
      }
      tabs={[
        {
          key: "general",
          label: "General",
          icon: <SlidersHorizontal size={16} aria-hidden />,
          content: (
            <>
              <Molecule.SettingsSection title="Appearance">
                <ThemeToggle block />
              </Molecule.SettingsSection>
              <Molecule.SettingsSection title="Content">
                <Molecule.SettingsRow
                  label="Show NSFW content"
                  description="Show 18+ anime, manga, and games in search, title pages, feeds, and libraries."
                >
                  <NsfwSwitch />
                </Molecule.SettingsRow>
                <Molecule.SettingsRow
                  label="Show update notes"
                  description={
                    <>
                      Show a note on your home feed when Orbis gets new features or fixes. You can
                      always read them in the{" "}
                      <Link href="/changelog" className="font-semibold text-accent hover:underline">
                        changelog
                      </Link>
                      .
                    </>
                  }
                >
                  <ChangelogSwitch />
                </Molecule.SettingsRow>
              </Molecule.SettingsSection>
              <Molecule.SettingsSection
                title="Guided tours"
                description="Watch the welcome tour on Home and the tips on each page again."
              >
                <RestartTours />
              </Molecule.SettingsSection>
            </>
          ),
        },
        {
          key: "privacy",
          label: "Privacy",
          icon: <Lock size={16} aria-hidden />,
          content: (
            <Molecule.SettingsSection title="Visibility">
              <Molecule.SettingsRow
                label="Appear offline"
                description="Friends see you as offline. You can still post as usual."
              >
                <AppearOfflineSwitch />
              </Molecule.SettingsRow>
              <Molecule.SettingsRow
                label="Private profile"
                description="Only your friends can see your posts, friends, communities, and library. Everyone else sees just your name and picture."
              >
                <PrivateProfileSwitch />
              </Molecule.SettingsRow>
            </Molecule.SettingsSection>
          ),
        },
        {
          key: "connections",
          label: "Connections",
          icon: <Link2 size={16} aria-hidden />,
          content: (
            <>
              <Molecule.SettingsSection
                title="Log in with Discord or Twitch"
                description="Use Discord or Twitch to log in to Orbis. If their verified email matches your Orbis email, they connect automatically."
              >
                <OAuthConnections />
              </Molecule.SettingsSection>
              <SteamConnection />
            </>
          ),
        },
        {
          key: "security",
          label: "Security",
          icon: <ShieldCheck size={16} aria-hidden />,
          content: (
            <Molecule.SettingsSection
              title="Two-factor sign-in"
              description="When you log in with your password, Orbis also asks for a code from an authenticator app on your phone."
            >
              <TwoFactorSettings profile={profile} />
            </Molecule.SettingsSection>
          ),
        },
        {
          key: "account",
          label: "Account",
          icon: <UserRound size={16} aria-hidden />,
          content: (
            <Molecule.SettingsSection title="Email" description="Only you can see this.">
              <p className="truncate text-sm">{profile.email}</p>
              {profile.emailVerifiedAt ? (
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <CircleCheck size={14} aria-hidden className="text-success" />
                  Confirmed
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted">
                    Not confirmed yet. Open the link we emailed you to confirm it.
                  </p>
                  <ResendConfirmation />
                </div>
              )}
            </Molecule.SettingsSection>
          ),
        },
      ]}
    />
  );
}

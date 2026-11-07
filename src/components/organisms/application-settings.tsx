"use client";

import { SlidersHorizontal } from "lucide-react";
import * as Molecule from "@molecule";
import { FriendsSidePanel } from "./friends-panel";
import { SettingsTabs } from "./settings-tabs";
import { StartupSwitch } from "./startup-switch";

export function ApplicationSettings() {
  return (
    <SettingsTabs
      label="Application settings sections"
      aside={
        <FriendsSidePanel />
      }
      tabs={[
        {
          key: "general",
          label: "General",
          icon: <SlidersHorizontal size={16} aria-hidden />,
          content: (
            <Molecule.SettingsSection title="Startup">
              <Molecule.SettingsRow
                label="Start Orbis on startup"
                description="Open Orbis automatically when you log in to your computer."
              >
                <StartupSwitch />
              </Molecule.SettingsRow>
            </Molecule.SettingsSection>
          ),
        },
      ]}
    />
  );
}

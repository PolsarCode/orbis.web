"use client";

import { SlidersHorizontal } from "lucide-react";
import * as Molecule from "@molecule";
import { FriendsSidePanel } from "./friends-panel";
import { SettingsTabs } from "./settings-tabs";
import { StartupSettings } from "./startup-settings";

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
              <StartupSettings />
            </Molecule.SettingsSection>
          ),
        },
      ]}
    />
  );
}

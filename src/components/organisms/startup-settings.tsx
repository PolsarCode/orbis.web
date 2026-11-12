"use client";

import { App, Switch } from "antd";
import { useEffect, useState } from "react";
import * as Molecule from "@molecule";
import { setStartOnLogin, setStartsMinimized, startsMinimized, startsOnLogin } from "@/lib/desktop";

function useDesktopSetting(load: () => Promise<boolean>, save: (enabled: boolean) => Promise<void>) {
  const { message } = App.useApp();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    load()
      .then(setEnabled)
      .catch(() => setEnabled(false));
  }, [load]);

  async function change(next: boolean) {
    setEnabled(next);
    try {
      await save(next);
    } catch {
      setEnabled(!next);
      message.error("Couldn’t change this setting. Please try again.");
    }
  }

  return [enabled, change] as const;
}

export function StartupSettings() {
  const [startOnLogin, changeStartOnLogin] = useDesktopSetting(startsOnLogin, setStartOnLogin);
  const [minimized, changeMinimized] = useDesktopSetting(startsMinimized, setStartsMinimized);

  return (
    <>
      <Molecule.SettingsRow
        label="Start Orbis on startup"
        description="Open Orbis automatically when you log in to your computer."
      >
        <Switch
          aria-label="Start Orbis on startup"
          checked={startOnLogin ?? false}
          loading={startOnLogin === null}
          disabled={startOnLogin === null}
          onChange={changeStartOnLogin}
        />
      </Molecule.SettingsRow>
      <Molecule.SettingsRow
        label="Start minimized"
        description="When Orbis opens on startup, keep it minimized until you need it."
      >
        <Switch
          aria-label="Start minimized"
          checked={minimized ?? false}
          loading={minimized === null}
          disabled={minimized === null || !startOnLogin}
          onChange={changeMinimized}
        />
      </Molecule.SettingsRow>
    </>
  );
}

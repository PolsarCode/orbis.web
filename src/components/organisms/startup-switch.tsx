"use client";

import { App, Switch } from "antd";
import { useEffect, useState } from "react";
import { setStartOnLogin, startsOnLogin } from "@/lib/desktop";

export function StartupSwitch() {
  const { message } = App.useApp();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    startsOnLogin()
      .then(setEnabled)
      .catch(() => setEnabled(false));
  }, []);

  async function handleChange(next: boolean) {
    setEnabled(next);
    try {
      await setStartOnLogin(next);
    } catch {
      setEnabled(!next);
      message.error("Couldn’t change this setting. Please try again.");
    }
  }

  return (
    <Switch
      aria-label="Start Orbis on startup"
      checked={enabled ?? false}
      loading={enabled === null}
      disabled={enabled === null}
      onChange={handleChange}
    />
  );
}

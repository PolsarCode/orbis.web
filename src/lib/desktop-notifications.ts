import type { Notification as OrbisNotification } from "@/lib/api";
import { inDesktopApp } from "@/lib/desktop";
import { displayName } from "@/lib/display-name";

async function allowed() {
  if (window.Notification.permission === "granted") return true;
  if (window.Notification.permission === "denied") return false;
  return (await window.Notification.requestPermission()) === "granted";
}

export async function showDesktopNotifications(notifications: OrbisNotification[]) {
  if (!inDesktopApp() || notifications.length === 0 || document.hasFocus()) return;
  if (!(await allowed().catch(() => false))) return;

  for (const notification of notifications) {
    const title = notification.actor ? displayName(notification.actor) : "Orbis";
    new window.Notification(title, { body: notification.message });
  }
}

import { create } from "zustand";
import { persist } from "zustand/middleware";

type NotificationPreferences = {
  toasts: boolean;
  desktop: boolean;
  setToasts: (toasts: boolean) => void;
  setDesktop: (desktop: boolean) => void;
};

export const useNotificationPreferencesStore = create<NotificationPreferences>()(
  persist(
    (set) => ({
      toasts: true,
      desktop: true,
      setToasts: (toasts) => set({ toasts }),
      setDesktop: (desktop) => set({ desktop }),
    }),
    {
      name: "notification-preferences",
      partialize: ({ toasts, desktop }) => ({ toasts, desktop }),
      merge: (saved, current) => {
        const values = (saved ?? {}) as Partial<NotificationPreferences>;
        return {
          ...current,
          toasts: typeof values.toasts === "boolean" ? values.toasts : current.toasts,
          desktop: typeof values.desktop === "boolean" ? values.desktop : current.desktop,
        };
      },
    },
  ),
);

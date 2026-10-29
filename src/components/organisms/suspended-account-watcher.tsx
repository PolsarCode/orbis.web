"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ACCOUNT_SUSPENDED_EVENT } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export const SUSPENSION_NOTICE_KEY = "orbis:suspension-notice";

export function SuspendedAccountWatcher() {
  const router = useRouter();

  useEffect(() => {
    function signOut(event: Event) {
      const { token, logout } = useAuthStore.getState();
      if (!token) return;
      const notice = (event as CustomEvent<string | null>).detail;
      try {
        if (notice) sessionStorage.setItem(SUSPENSION_NOTICE_KEY, notice);
      } catch {}
      logout();
      router.replace("/login");
    }

    window.addEventListener(ACCOUNT_SUSPENDED_EVENT, signOut);
    return () => window.removeEventListener(ACCOUNT_SUSPENDED_EVENT, signOut);
  }, [router]);

  return null;
}

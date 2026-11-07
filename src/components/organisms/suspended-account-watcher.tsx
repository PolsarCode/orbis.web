"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ACCOUNT_SUSPENDED_EVENT, SESSION_ENDED_EVENT } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export const SUSPENSION_NOTICE_KEY = "orbis:suspension-notice";

function endSession() {
  useAuthStore.getState().logout();
}

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
    window.addEventListener(SESSION_ENDED_EVENT, endSession);
    return () => {
      window.removeEventListener(ACCOUNT_SUSPENDED_EVENT, signOut);
      window.removeEventListener(SESSION_ENDED_EVENT, endSession);
    };
  }, [router]);

  return null;
}

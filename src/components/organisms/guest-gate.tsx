"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import * as Molecule from "@molecule";
import { inDesktopApp } from "@/lib/desktop";
import { useAuthStore } from "@/stores/auth-store";
import { skipStartupScreen } from "./startup-screen";

const noSubscription = () => () => {};

export function GuestGate({
  children,
  home,
}: {
  children: ReactNode;
  home?: ReactNode;
}) {
  const router = useRouter();
  const authenticated = useSyncExternalStore(
    useAuthStore.subscribe,
    () => Boolean(useAuthStore.getState().token),
    () => false,
  );
  const desktop = useSyncExternalStore(noSubscription, inDesktopApp, () => false);
  const hasHome = home !== undefined;

  useEffect(() => {
    if (!useAuthStore.getState().token) {
      delete document.documentElement.dataset.auth;
      skipStartupScreen();
      return;
    }

    if (!hasHome) router.replace("/");
  }, [router, hasHome]);

  useEffect(() => {
    if (desktop && hasHome && !authenticated) router.replace("/login");
  }, [router, desktop, hasHome, authenticated]);

  return (
    <>
      <div className="contents authenticated:hidden">
        {desktop && hasHome ? <Molecule.LoadingScreen /> : children}
      </div>
      {authenticated && hasHome ? (
        home
      ) : (
        <div className="hidden authenticated:contents">
          <Molecule.LoadingScreen />
        </div>
      )}
    </>
  );
}

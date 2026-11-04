"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Molecule from "@molecule";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { useFriendsStore } from "@/stores/friends-store";
import { useMessagesStore } from "@/stores/messages-store";

const MIN_VISIBLE_MS = 500;
const MAX_VISIBLE_MS = 15_000;
const FADE_MS = 300;

let phase: "idle" | "pending" | "done" = "idle";

export function skipStartupScreen() {
  if (phase === "idle") phase = "done";
}

function openedHere() {
  if (typeof window === "undefined") return true;
  const [entry] = performance.getEntriesByType("navigation");
  return !entry || new URL(entry.name).pathname === window.location.pathname;
}

function settled() {
  const { token, profile, profileFailed } = useAuthStore.getState();
  const communities = useCommunityStore.getState();
  const friends = useFriendsStore.getState();

  return (
    !token ||
    ((profile !== null || profileFailed) &&
      (communities.loaded || communities.failed) &&
      (friends.loaded || friends.failed) &&
      useMessagesStore.getState().loaded)
  );
}

export function StartupScreen() {
  const pathname = usePathname();
  const skipped = pathname.startsWith("/auth/") || pathname === "/confirm-email";
  const [state, setState] = useState<"shown" | "leaving" | "gone">(() =>
    phase === "pending" || (phase === "idle" && openedHere()) ? "shown" : "gone",
  );
  const waiting = state === "shown" && !skipped;
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!waiting) return;
    phase = "pending";
    let hold: ReturnType<typeof setTimeout> | undefined;
    const leave = () => setState("leaving");
    const check = () => {
      if (hold !== undefined || !settled()) return;
      phase = "done";
      hold = setTimeout(leave, Math.max(0, MIN_VISIBLE_MS - performance.now()));
    };
    const cap = setTimeout(leave, Math.max(0, MAX_VISIBLE_MS - performance.now()));
    const unsubscribes = [
      useAuthStore.subscribe(check),
      useCommunityStore.subscribe(check),
      useFriendsStore.subscribe(check),
      useMessagesStore.subscribe(check),
    ];
    check();

    return () => {
      clearTimeout(hold);
      clearTimeout(cap);
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [waiting]);

  useEffect(() => {
    const own = wrapper.current;
    if (!own || state !== "shown" || !useAuthStore.getState().token) return;
    const covered = [...(own.parentElement?.children ?? [])].filter((element) => element !== own);
    covered.forEach((element) => element.setAttribute("inert", ""));
    return () => covered.forEach((element) => element.removeAttribute("inert"));
  }, [state]);

  useEffect(() => {
    if (state !== "leaving") return;
    phase = "done";
    const fade = setTimeout(() => setState("gone"), FADE_MS);
    return () => clearTimeout(fade);
  }, [state]);

  if (skipped || state === "gone") return null;

  return (
    <div ref={wrapper} className="hidden authenticated:contents">
      <Molecule.LoadingScreen leaving={state === "leaving"} />
    </div>
  );
}

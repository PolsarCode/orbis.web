"use client";

import { useSyncExternalStore } from "react";

const phoneQuery = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(phoneQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useIsPhone() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(phoneQuery).matches,
    () => false,
  );
}

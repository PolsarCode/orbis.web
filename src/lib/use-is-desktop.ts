"use client";

import { useMediaQuery } from "./use-media-query";

export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)", true);
}

"use client";

import { useMediaQuery } from "./use-media-query";

export function useIsPhone() {
  return useMediaQuery("(max-width: 639px)", false);
}

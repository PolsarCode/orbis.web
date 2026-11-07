"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { currentPath, loginUrl } from "./login";

export function useSignOutRedirect() {
  const router = useRouter();

  useEffect(
    () =>
      useAuthStore.subscribe(({ token }, previous) => {
        if (previous.token && !token) router.replace(loginUrl(currentPath()));
      }),
    [router],
  );
}

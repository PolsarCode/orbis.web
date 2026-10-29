"use client";

import { useDocumentTitle } from "@/lib/use-document-title";
import { useAuthStore } from "@/stores/auth-store";

export function DocumentTitle({ title, guestOnly = false }: { title: string; guestOnly?: boolean }) {
  const signedIn = useAuthStore((state) => Boolean(state.token));
  useDocumentTitle(guestOnly && signedIn ? null : title);
  return null;
}

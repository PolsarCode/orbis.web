import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CommunityView } from "../community-view";

export const metadata: Metadata = { title: "Forum" };

export default function ForumLayout({ children }: { children: ReactNode }) {
  return <CommunityView forum={children} />;
}

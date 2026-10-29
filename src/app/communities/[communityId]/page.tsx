import type { Metadata } from "next";
import { CommunityView } from "./community-view";

export const metadata: Metadata = { title: "Community" };

export default function CommunityPage() {
  return <CommunityView />;
}

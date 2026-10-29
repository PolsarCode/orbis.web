import type { Metadata } from "next";
import { CommunityView } from "../community-view";

export const metadata: Metadata = { title: "Members" };

export default function CommunityMembersPage() {
  return <CommunityView members />;
}

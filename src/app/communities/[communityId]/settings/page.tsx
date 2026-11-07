"use client";

import { Lock } from "lucide-react";
import * as Organism from "@organism";
import { canManage } from "@/lib/api";
import {
  CommunityLockedState,
  CommunitySubpage,
} from "../community-page";

export default function CommunitySettingsPage() {
  return (
    <CommunitySubpage title="Community settings" heading="Settings">
      {(community) => {
        const members = (
          <Organism.SidePanel label="Members">
            <Organism.MemberPresence key={community.id} communityId={community.id} />
          </Organism.SidePanel>
        );

        return canManage(community) ? (
          <Organism.CommunitySettings key={community.id} community={community} aside={members} />
        ) : (
          <CommunityLockedState
            community={community}
            icon={<Lock size={32} strokeWidth={1.5} />}
            title="You don’t have access."
            description={`You don’t have access to community settings. Only the owner and admins can make changes to ${community.name}.`}
            note="To request changes, contact the community owner."
            aside={members}
          />
        );
      }}
    </CommunitySubpage>
  );
}

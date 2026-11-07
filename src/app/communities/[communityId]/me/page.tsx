"use client";

import { UserRound } from "lucide-react";
import { useState } from "react";
import * as Organism from "@organism";
import {
  CommunityLockedState,
  CommunitySubpage,
} from "../community-page";

export default function CommunityMemberSettingsPage() {
  const [saves, setSaves] = useState(0);

  return (
    <CommunitySubpage title="Your settings" heading="Your settings">
      {(community) => {
        const members = (
          <Organism.SidePanel label="Members">
            <Organism.MemberPresence key={`${community.id}-${saves}`} communityId={community.id} />
          </Organism.SidePanel>
        );

        return community.role ? (
          <Organism.CommunityMemberSettings
            key={community.id}
            community={community}
            onSaved={() => setSaves((count) => count + 1)}
            aside={members}
          />
        ) : (
          <CommunityLockedState
            community={community}
            icon={<UserRound size={32} strokeWidth={1.5} />}
            title="Join to set this up."
            description={`Your settings for ${community.name} are available once you’re a member.`}
            aside={members}
          />
        );
      }}
    </CommunitySubpage>
  );
}

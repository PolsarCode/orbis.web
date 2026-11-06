"use client";

import { Select } from "antd";
import { ChevronDown } from "lucide-react";
import * as Atom from "@atom";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";

export type Destination = "wall" | number;

export function DestinationPicker({
  value,
  onChange,
}: {
  value: Destination;
  onChange: (value: Destination) => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const communities = useCommunityStore((state) => state.communities);
  const community =
    value === "wall" ? undefined : communities.find((item) => item.id === value);

  if (!profile) return null;

  return (
    <div className="flex items-center gap-3">
      {community ? (
        <span
          aria-hidden
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-divider bg-rail-item font-display text-[17.6px] leading-none font-bold"
        >
          <Atom.CommunityIcon name={community.name} src={community.iconUrl} />
        </span>
      ) : (
        <Atom.Avatar
          size="sm"
          label={profile.username}
          src={profile.avatarUrl}
          seed={profile.userId}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted uppercase">Post to</span>
        <Select<Destination>
          aria-label="Post to"
          variant="borderless"
          size="small"
          value={community?.id ?? "wall"}
          onChange={onChange}
          suffixIcon={<ChevronDown size={12} />}
          options={[
            { value: "wall", label: "Your wall", iconUrl: profile.avatarUrl },
            ...communities.map((item) => ({
              value: item.id,
              label: item.name,
              iconUrl: item.iconUrl,
            })),
          ]}
          optionRender={({ data }) => (
            <span className="flex items-center gap-2">
              {data.value === "wall" ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  <Atom.Avatar
                    size="xs"
                    label={profile.username}
                    src={profile.avatarUrl}
                    seed={profile.userId}
                  />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rail-item font-display text-[13px] leading-none font-bold"
                >
                  <Atom.CommunityIcon name={String(data.label)} src={data.iconUrl} />
                </span>
              )}
              <span className="truncate">{data.label}</span>
            </span>
          )}
          popupMatchSelectWidth={false}
          className="-ml-[7px] w-fit max-w-full text-[13px] font-semibold"
        />
      </div>
    </div>
  );
}

"use client";

import { Switch } from "antd";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  disconnectDiscordChannel,
  getDiscordChannel,
  getOAuthProviders,
  updateDiscordChannel,
  type Community,
  type DiscordChannel,
  type DiscordChannelSettings as Settings,
} from "@/lib/api";
import { oauthColors, startOAuth } from "@/lib/oauth";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { OAuthIcon } from "./oauth-buttons";

const sendOptions: { key: keyof Settings; label: string; description?: string }[] = [
  { key: "sendPosts", label: "Feed posts" },
  {
    key: "sendLibrary",
    label: "Library updates",
    description:
      "Only from members who share their library updates here, and never private or 18+ titles.",
  },
];

export function DiscordChannelSettings({ community }: { community: Community }) {
  const [channel, setChannel] = useState<DiscordChannel | null | undefined>(undefined);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState<keyof Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPublic = useCommunityStore(
    (state) =>
      state.communities.find(({ id }) => id === community.id)?.isPublic ?? community.isPublic,
  );

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getDiscordChannel(token, community.id)
      .then(setChannel)
      .catch((e: Error) => {
        setChannel(null);
        setError(e.message);
      });
    getOAuthProviders()
      .then((providers) => setEnabled(providers.includes("discord")))
      .catch(() => setEnabled(false));
  }, [community.id]);

  if (!channel && enabled === false) return null;

  async function connect() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      await startOAuth("discord", token, community.id, "channel");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(false);
    }
  }

  async function disconnect() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      await disconnectDiscordChannel(token, community.id);
      setChannel(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function toggle(key: keyof Settings, value: boolean) {
    const { token } = useAuthStore.getState();
    if (!token || !channel) return;
    setSaving(key);
    setError(null);
    try {
      setChannel(await updateDiscordChannel(token, community.id, { [key]: value }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(null);
    }
  }

  const lost = Boolean(channel?.lostAt);
  const status =
    channel === undefined
      ? "Checking…"
      : !isPublic
        ? channel
          ? "Paused while the community is private"
          : "Only for public communities"
        : !channel
          ? "Not connected"
          : lost
            ? "Disconnected in Discord"
            : `Posting to a channel in ${channel.guildName ?? "your Discord server"}`;
  const muted = isPublic ? "" : "opacity-50";

  return (
    <Molecule.SettingsSection
      title="Discord channel"
      description="Send what’s new in this community to a channel in your Discord server. Each message shows the author’s name and picture, with a link to the post on Orbis."
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${oauthColors.discord} ${muted}`}
        >
          <OAuthIcon provider="discord" />
        </span>
        <div className={`flex min-w-0 flex-1 flex-col ${muted}`}>
          <span className="text-sm font-semibold">Discord channel</span>
          <span className="truncate text-xs text-muted">{status}</span>
        </div>
        {channel ? (
          <div className="flex shrink-0 gap-2">
            {lost && (
              <Molecule.ReadOnlyGate action="connect a channel">
                <Atom.Button
                  size="small"
                  loading={pending}
                  disabled={!isPublic}
                  onClick={connect}
                >
                  Connect again
                </Atom.Button>
              </Molecule.ReadOnlyGate>
            )}
            <Atom.Button size="small" variant="secondary" loading={pending} onClick={disconnect}>
              Disconnect
            </Atom.Button>
          </div>
        ) : (
          <Molecule.ReadOnlyGate action="connect a channel">
            <Atom.Button
              size="small"
              loading={pending}
              disabled={enabled !== true || channel === undefined || !isPublic}
              onClick={connect}
            >
              Connect a channel
            </Atom.Button>
          </Molecule.ReadOnlyGate>
        )}
      </div>
      {channel && !lost && isPublic && (
        <a
          href={`https://discord.com/channels/${channel.guildId}/${channel.channelId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring flex w-fit items-center gap-1.5 rounded-sm text-[13px] font-semibold text-accent hover:underline"
        >
          Open in Discord
          <ExternalLink size={14} aria-hidden />
        </a>
      )}
      {lost && isPublic && (
        <p className="text-xs text-muted">
          The Orbis webhook was removed from that channel in Discord, so nothing is being sent.
          Connect a channel again to keep posting there.
        </p>
      )}
      {channel && (
        <div className={`flex flex-col gap-4 ${muted}`}>
          <span className="text-xs font-semibold text-muted uppercase">Send to Discord</span>
          {sendOptions.map(({ key, label, description }) => (
            <Molecule.SettingsRow key={key} label={label} description={description}>
              <Molecule.ReadOnlyGate action="change what’s sent">
                <Switch
                  checked={Boolean(channel[key])}
                  loading={saving === key}
                  disabled={lost || !isPublic}
                  onChange={(value) => toggle(key, value)}
                />
              </Molecule.ReadOnlyGate>
            </Molecule.SettingsRow>
          ))}
        </div>
      )}
      {!isPublic && (
        <p className="text-xs text-muted">
          {channel
            ? "Nothing is sent while the community is private. Make it public under General to start again, or disconnect the channel."
            : "Discord channels are only for public communities. To use one, make the community public under General."}
        </p>
      )}
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
    </Molecule.SettingsSection>
  );
}

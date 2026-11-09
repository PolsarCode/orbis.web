"use client";

import { Switch } from "antd";
import { ExternalLink } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  disconnectDiscordChannel,
  getDiscordChannel,
  getOAuthProviders,
  updateDiscordChannel,
  type Community,
  type DiscordChannelSettings as Settings,
  type OAuthTarget,
} from "@/lib/api";
import { startOAuth } from "@/lib/oauth";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { OAuthConnectionRow } from "./oauth-buttons";

type WebhookChannel = {
  guildId: string;
  guildName: string | null;
  channelId: string;
  lostAt: string | null;
};

type WebhookRequests<T, S> = {
  load: (token: string, communityId: number) => Promise<T | null>;
  update: (token: string, communityId: number, settings: S) => Promise<T | null>;
  disconnect: (token: string, communityId: number) => Promise<void>;
};

export type SendOption<K extends string> = { key: K; label: string; description?: string };

export function DiscordPart({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 py-6 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function useDiscordWebhook<T extends WebhookChannel, S>(
  communityId: number,
  target: OAuthTarget,
  requests: WebhookRequests<T, S>,
) {
  const [channel, setChannel] = useState<T | null | undefined>(undefined);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    requests
      .load(token, communityId)
      .then(setChannel)
      .catch((e: Error) => {
        setChannel(null);
        setError(e.message);
      });
    getOAuthProviders()
      .then((providers) => setEnabled(providers.includes("discord")))
      .catch(() => setEnabled(false));
  }, [communityId, requests]);

  async function connect() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      await startOAuth("discord", token, communityId, target);
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
      await requests.disconnect(token, communityId);
      setChannel(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function save(key: string, settings: S) {
    const { token } = useAuthStore.getState();
    if (!token || !channel) return false;
    setSaving(key);
    setError(null);
    try {
      setChannel(await requests.update(token, communityId, settings));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setSaving(null);
    }
  }

  return { channel, enabled, pending, saving, error, connect, disconnect, save };
}

export function webhookStatus(channel: WebhookChannel | null | undefined) {
  if (channel === undefined) return "Checking…";
  if (!channel) return "Not connected";
  if (channel.lostAt) return "Disconnected in Discord";
  return `Posting to a channel in ${channel.guildName ?? "your Discord server"}`;
}

export function DiscordWebhookConnection({
  title,
  status,
  channel,
  enabled,
  pending,
  paused = false,
  onConnect,
  onDisconnect,
}: {
  title: string;
  status: string;
  channel: WebhookChannel | null | undefined;
  enabled: boolean | null;
  pending: boolean;
  paused?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const lost = Boolean(channel?.lostAt);

  return (
    <>
      <OAuthConnectionRow provider="discord" title={title} status={status} dimmed={paused}>
        {channel ? (
          <div className="flex shrink-0 gap-2">
            {lost && (
              <Molecule.ReadOnlyGate action="connect a channel">
                <Atom.Button size="small" loading={pending} disabled={paused} onClick={onConnect}>
                  Connect again
                </Atom.Button>
              </Molecule.ReadOnlyGate>
            )}
            <Atom.Button size="small" variant="secondary" loading={pending} onClick={onDisconnect}>
              Disconnect
            </Atom.Button>
          </div>
        ) : (
          <Molecule.ReadOnlyGate action="connect a channel">
            <Atom.Button
              size="small"
              loading={pending}
              disabled={enabled !== true || channel === undefined || paused}
              onClick={onConnect}
            >
              Connect a channel
            </Atom.Button>
          </Molecule.ReadOnlyGate>
        )}
      </OAuthConnectionRow>
      {channel && !lost && !paused && (
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
      {lost && !paused && (
        <p className="text-xs text-muted">
          The Orbis webhook was removed from that channel in Discord, so nothing is being sent.
          Connect a channel again to keep posting there.
        </p>
      )}
    </>
  );
}

export function DiscordSendSwitches<K extends string>({
  options,
  values,
  saving,
  disabled,
  dimmed = false,
  onToggle,
}: {
  options: SendOption<K>[];
  values: Record<K, boolean>;
  saving: string | null;
  disabled: boolean;
  dimmed?: boolean;
  onToggle: (key: K, value: boolean) => void;
}) {
  return (
    <div className={`flex flex-col gap-4 ${dimmed ? "opacity-50" : ""}`}>
      <span className="text-xs font-semibold text-muted uppercase">Send to Discord</span>
      {options.map(({ key, label, description }) => (
        <Molecule.SettingsRow key={key} label={label} description={description}>
          <Molecule.ReadOnlyGate action="change what’s sent">
            <Switch
              checked={Boolean(values[key])}
              loading={saving === key}
              disabled={disabled}
              onChange={(value) => onToggle(key, value)}
            />
          </Molecule.ReadOnlyGate>
        </Molecule.SettingsRow>
      ))}
    </div>
  );
}

const sendOptions: SendOption<keyof Settings>[] = [
  { key: "sendPosts", label: "Feed posts" },
  {
    key: "sendLibrary",
    label: "Library updates",
    description:
      "Only from members who share their library updates here, and never private or 18+ titles.",
  },
];

const requests = {
  load: getDiscordChannel,
  update: updateDiscordChannel,
  disconnect: disconnectDiscordChannel,
};

export function DiscordChannelSettings({ community }: { community: Community }) {
  const { channel, enabled, pending, saving, error, connect, disconnect, save } =
    useDiscordWebhook(community.id, "channel", requests);
  const isPublic = useCommunityStore(
    (state) =>
      state.communities.find(({ id }) => id === community.id)?.isPublic ?? community.isPublic,
  );

  if (!channel && enabled === false) return null;

  const status =
    channel !== undefined && !isPublic
      ? channel
        ? "Paused while the community is private"
        : "Only for public communities"
      : webhookStatus(channel);

  return (
    <DiscordPart
      title="Feed"
      description="Send what’s new in this community to a channel in your Discord server. Each message shows the author’s name and picture, with a link to the post on Orbis."
    >
      <DiscordWebhookConnection
        title="Feed channel"
        status={status}
        channel={channel}
        enabled={enabled}
        pending={pending}
        paused={!isPublic}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      {channel && (
        <DiscordSendSwitches
          options={sendOptions}
          values={channel}
          saving={saving}
          disabled={Boolean(channel.lostAt) || !isPublic}
          dimmed={!isPublic}
          onToggle={(key, value) => save(key, { [key]: value })}
        />
      )}
      {!isPublic && (
        <p className="text-xs text-muted">
          {channel
            ? "Nothing is sent while the community is private. Make it public under General to start again, or disconnect the channel."
            : "Discord channels are only for public communities. To use one, make the community public under General."}
        </p>
      )}
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
    </DiscordPart>
  );
}

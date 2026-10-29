"use client";

import { App, Modal, Switch } from "antd";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  acceptLinkedAvatar,
  disconnectOAuth,
  getOAuthConnections,
  getOAuthProviders,
  setShowClips,
  setShowLive,
  type OAuthConnections as Connections,
  type OAuthProvider,
} from "@/lib/api";
import {
  clearPendingAvatar,
  OAUTH_PROVIDERS,
  oauthColors,
  oauthLabels,
  readPendingAvatar,
  startOAuth,
  type PendingAvatar,
} from "@/lib/oauth";
import { useAuthStore } from "@/stores/auth-store";
import { OAuthIcon } from "./oauth-buttons";

function LinkedAvatarPrompt() {
  const { message } = App.useApp();
  const profile = useAuthStore((state) => state.profile);
  const [offer, setOffer] = useState<PendingAvatar | null>(readPendingAvatar);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!offer || !profile || profile.avatarUrl) return null;
  const label = oauthLabels[offer.provider];

  function close() {
    clearPendingAvatar();
    setOffer(null);
  }

  async function accept() {
    const { token } = useAuthStore.getState();
    if (!token || !offer) return;
    setSaving(true);
    setError(null);
    try {
      const avatarUrl = await acceptLinkedAvatar(token, offer.token);
      useAuthStore.setState((state) =>
        state.profile ? { profile: { ...state.profile, avatarUrl } } : state,
      );
      message.success("Profile picture updated.");
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={null}
      footer={null}
      onCancel={saving ? undefined : close}
      mask={{ closable: !saving }}
      closable={!saving}
      width={420}
      centered
      styles={{ container: { padding: 24 } }}
    >
      <div className="flex flex-col gap-6">
        <Molecule.ModalHeader
          eyebrow={`${label} connected`}
          title={`Use your ${label} picture?`}
          description="It becomes your Orbis profile picture. You can change it any time."
        />
        <div className="flex justify-center">
          <Atom.Avatar size="lg" label={profile.username} src={offer.url} seed={profile.userId} />
        </div>
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex justify-end gap-2 border-t border-divider pt-6">
          <Atom.Button variant="secondary" onClick={close} disabled={saving}>
            Not now
          </Atom.Button>
          <Atom.Button onClick={accept} loading={saving}>
            Use picture
          </Atom.Button>
        </div>
      </div>
    </Modal>
  );
}

export function OAuthConnections() {
  const [data, setData] = useState<{ enabled: OAuthProvider[]; connections: Connections } | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    Promise.all([getOAuthProviders(), getOAuthConnections(token)])
      .then(([enabled, connections]) => setData({ enabled, connections }))
      .catch(() => setFailed(true));
  }

  useEffect(load, []);

  async function connect(provider: OAuthProvider) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(provider);
    setError(null);
    try {
      await startOAuth(provider, token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(null);
    }
  }

  async function toggleTwitch(setting: "showLive" | "showClips", value: boolean) {
    const { token } = useAuthStore.getState();
    if (!token || !data) return;
    setError(null);
    const before = data;
    setData({
      ...data,
      connections: {
        ...data.connections,
        connections: data.connections.connections.map((item) =>
          item.provider === "twitch" ? { ...item, [setting]: value } : item,
        ),
      },
    });
    try {
      await (setting === "showLive" ? setShowLive : setShowClips)(token, "twitch", value);
    } catch (e) {
      setData(before);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function disconnect(provider: OAuthProvider) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(provider);
    setError(null);
    try {
      await disconnectOAuth(token, provider);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  if (failed) return <Atom.ErrorMessage>Couldn’t load your connections.</Atom.ErrorMessage>;
  if (!data) return <Atom.Loader />;

  const { enabled, connections } = data;
  const onlyWay = !connections.hasPassword && connections.connections.length === 1;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-divider">
        {OAUTH_PROVIDERS.map((provider) => {
          const connection = connections.connections.find((item) => item.provider === provider);
          if (!connection && !enabled.includes(provider)) return null;
          const locked = Boolean(connection) && onlyWay;

          return (
            <li key={provider} className="flex flex-col gap-3 py-3">
              <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${oauthColors[provider]}`}
              >
                <OAuthIcon provider={provider} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold">{oauthLabels[provider]}</span>
                <span className="truncate text-xs text-muted">
                  {connection
                    ? locked
                      ? `Connected as ${connection.username}. It’s how you log in, so it can’t be disconnected.`
                      : `Connected as ${connection.username}`
                    : "Not connected"}
                </span>
              </div>
              {connection ? (
                <Atom.Button
                  size="small"
                  variant="secondary"
                  disabled={locked || pending !== null}
                  loading={pending === provider}
                  onClick={() => disconnect(provider)}
                >
                  Disconnect
                </Atom.Button>
              ) : (
                <Atom.Button
                  size="small"
                  disabled={pending !== null}
                  loading={pending === provider}
                  onClick={() => connect(provider)}
                >
                  Connect
                </Atom.Button>
              )}
              </div>
              {provider === "twitch" && connection && (
                <div className="flex flex-col gap-4 pl-11">
                  <Molecule.SettingsRow
                    label="Live status"
                    description="Show a LIVE badge on your profile while you’re streaming, and a countdown to your next scheduled stream. Friends and communities also see you as Streaming."
                  >
                    <Switch
                      checked={connection.showLive}
                      onChange={(value) => toggleTwitch("showLive", value)}
                    />
                  </Molecule.SettingsRow>
                  <Molecule.SettingsRow
                    label="Clips tab"
                    description="Show your most-watched Twitch clips in a Clips tab on your profile."
                  >
                    <Switch
                      checked={connection.showClips}
                      onChange={(value) => toggleTwitch("showClips", value)}
                    />
                  </Molecule.SettingsRow>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <LinkedAvatarPrompt />
    </div>
  );
}

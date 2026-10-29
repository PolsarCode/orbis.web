"use client";

import { Input, Modal, Switch } from "antd";
import { Link2, ShieldCheck, SlidersHorizontal, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  connectDiscordServer,
  disconnectCommunityDiscord,
  disconnectCommunityTwitch,
  getCommunity,
  getInvites,
  getMembers,
  getOAuthProviders,
  revokeInvite,
  setCommunityAdmin,
  type Community,
  type CommunityConnectionSetting,
  type CommunityLinks,
  type DiscordStatus,
  type Invite,
  type Member,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { inviteExpiry, inviteUses } from "@/lib/invites";
import {
  clearDiscordServers,
  oauthColors,
  readDiscordServers,
  startOAuth,
  type PendingServers,
} from "@/lib/oauth";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { linkPlatforms, normalizeLink } from "./community-links";
import { DiscordChannelSettings } from "./discord-channel-settings";
import { DISCORD_CHECK_MS, DiscordWidgetSteps } from "./discord-setup";
import { OAuthIcon } from "./oauth-buttons";
import { SettingsTabs } from "./settings-tabs";

function GeneralSettings({ community }: { community: Community }) {
  const updateCommunity = useCommunityStore((state) => state.updateCommunity);
  const [saved, setSaved] = useState(community);
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [isPublic, setIsPublic] = useState(community.isPublic);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const changed =
    name.trim() !== saved.name ||
    description.trim() !== (saved.description ?? "") ||
    isPublic !== saved.isPublic;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      const updated = await updateCommunity(community.id, {
        name: name.trim(),
        description: description.trim(),
        isPublic,
      });
      setSaved(updated);
      setName(updated.name);
      setDescription(updated.description ?? "");
      setMessage("Settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.SettingsSection title="General">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Molecule.FormField
          label="Community name"
          name="name"
          size="large"
          required
          maxLength={100}
          pattern=".*\S.*"
          title="Enter a name"
          autoComplete="off"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setMessage(null);
          }}
        />
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Description</span>
          <Input.TextArea
            name="description"
            maxLength={300}
            showCount
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="What’s this community about?"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setMessage(null);
            }}
          />
          <span className="text-xs text-muted">
            Shown when people hover over the community in Explore.
          </span>
        </label>
        <label className="flex items-start justify-between gap-4">
          <span className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold">Public community</span>
            <span className="text-xs text-muted">
              Anyone can find it in Explore and join. Turn this off to make the
              community private; only existing members can see its posts.
            </span>
          </span>
          <Switch
            checked={isPublic}
            onChange={(checked) => {
              setIsPublic(checked);
              setMessage(null);
            }}
          />
        </label>
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex items-center gap-3">
          <Atom.Button type="submit" loading={pending} disabled={!changed}>
            Save changes
          </Atom.Button>
          {message && <span className="text-xs text-muted">{message}</span>}
        </div>
      </form>
    </Molecule.SettingsSection>
  );
}

function LinksSettings({ community }: { community: Community }) {
  const updateCommunity = useCommunityStore((state) => state.updateCommunity);
  const [saved, setSaved] = useState<CommunityLinks>(community.links ?? {});
  const [values, setValues] = useState<CommunityLinks>(community.links ?? {});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const links: CommunityLinks = {};
  for (const { key } of linkPlatforms) {
    const link = normalizeLink(values[key] ?? "");
    if (link) links[key] = link;
  }
  const invalid = linkPlatforms.some(({ key, pattern }) => links[key] && !pattern.test(links[key]));
  const changed = linkPlatforms.some(({ key }) => links[key] !== saved[key]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid) return;
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      const updated = await updateCommunity(community.id, { links });
      setSaved(updated.links ?? {});
      setValues(updated.links ?? {});
      setMessage("Links saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.SettingsSection
      title="Links"
      description="Add the community’s other places. They show as icons on the cover photo, next to Twitch and Discord."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {linkPlatforms.map(({ key, label, icon, example, pattern }) => {
          const wrong = Boolean(links[key] && !pattern.test(links[key]));
          return (
            <Molecule.FormField
              key={key}
              label={label}
              name={key}
              inputMode="url"
              autoComplete="off"
              maxLength={300}
              prefix={<span className="text-muted">{icon}</span>}
              placeholder={example}
              status={wrong ? "error" : undefined}
              extra={wrong ? `Use a link like ${example}` : undefined}
              value={values[key] ?? ""}
              onChange={(event) => {
                setValues({ ...values, [key]: event.target.value });
                setMessage(null);
              }}
            />
          );
        })}
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex items-center gap-3">
          <Atom.Button type="submit" loading={pending} disabled={!changed || invalid}>
            Save links
          </Atom.Button>
          {message && <span className="text-xs text-muted">{message}</span>}
        </div>
      </form>
    </Molecule.SettingsSection>
  );
}

function AdminSettings({ community }: { community: Community }) {
  const isOwner = community.role === "owner";
  const [members, setMembers] = useState<Member[] | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    getMembers(token, community.id).then(setMembers);
  }, [community.id]);

  async function handleToggle(member: Member, isAdmin: boolean) {
    const { token } = useAuthStore.getState();
    if (!token) return;

    setError(null);
    setUpdating(member.userId);
    try {
      setMembers(
        await setCommunityAdmin(token, community.id, member.userId, isAdmin),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <Molecule.SettingsSection
      title="Admins"
      aside="Owner only"
      description={
        isOwner
          ? "Admins can manage community details. Only you, the owner, can add or remove admins and delete this community."
          : "Admins can manage community details. Only the owner can add or remove admins and delete this community."
      }
    >
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      {!members ? (
        <div className="flex py-6">
          <Atom.Loader />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((member) => {
            const label = member.nickname ?? displayName(member);
            return (
              <li key={member.userId} className="flex items-center gap-3 py-1">
                <Atom.Avatar
                  size="sm"
                  label={label}
                  src={member.avatarUrl}
                  seed={member.userId}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold">{label}</span>
                    {(member.isOwner || member.isAdmin) && (
                      <Atom.RoleBadge role={member.isOwner ? "owner" : "admin"} />
                    )}
                  </span>
                  <span className="truncate text-xs text-muted">
                    @{member.username}
                  </span>
                </div>
                <Switch
                  aria-label={`${label} is an admin`}
                  checked={member.isOwner || member.isAdmin}
                  disabled={!isOwner || member.isOwner}
                  loading={updating === member.userId}
                  onChange={(checked) => handleToggle(member, checked)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Molecule.SettingsSection>
  );
}

function InviteSettings({ community }: { community: Community }) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    getInvites(token, community.id)
      .then((list) => setInvites(list.filter((invite) => !invite.permanent)))
      .catch((e) => {
        setInvites([]);
        setError(e instanceof Error ? e.message : "Something went wrong.");
      });
  }, [community.id]);

  async function handleRevoke(code: string) {
    const { token } = useAuthStore.getState();
    if (!token) return;

    setError(null);
    setRevoking(code);
    try {
      await revokeInvite(token, community.id, code);
      setInvites((current) =>
        current ? current.filter((invite) => invite.code !== code) : current,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Molecule.SettingsSection
      title="Invites"
      description="Active invite links for this community. Revoke a link to stop anyone else from joining with it."
    >
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      {!invites ? (
        <div className="flex py-6">
          <Atom.Loader />
        </div>
      ) : invites.length === 0 ? (
        <p className="text-xs text-muted">
          No active invites. Create one with the invite button on the
          community page.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invites.map((invite) => {
            const label = displayName(invite.creator);
            return (
              <li key={invite.code} className="flex items-center gap-3 py-1">
                <Atom.Avatar
                  size="sm"
                  label={label}
                  src={invite.creator.avatarUrl}
                  seed={invite.creator.id}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-mono text-[13px] font-semibold">
                    {invite.code}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {label} · {inviteUses(invite)} · {inviteExpiry(invite)}
                  </span>
                </div>
                <Atom.Button
                  danger
                  variant="text"
                  size="small"
                  loading={revoking === invite.code}
                  onClick={() => handleRevoke(invite.code)}
                >
                  Revoke
                </Atom.Button>
              </li>
            );
          })}
        </ul>
      )}
    </Molecule.SettingsSection>
  );
}

function DangerZone({ community }: { community: Community }) {
  const router = useRouter();
  const deleteCommunity = useCommunityStore((state) => state.deleteCommunity);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setError(null);
    setPending(true);
    try {
      await deleteCommunity(community.id);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(false);
    }
  }

  const members = community.memberCount ?? 0;

  return (
    <Molecule.SettingsSection
      danger
      title="Delete community"
      description="This permanently removes all posts and memberships. This action can’t be undone."
    >
      <Atom.Button
        danger
        className="w-fit"
        aria-expanded={confirming}
        onClick={() => setConfirming(true)}
      >
        Delete community
      </Atom.Button>
      {confirming && (
        <div
          role="alertdialog"
          aria-labelledby="delete-community-title"
          className="flex flex-col gap-4 rounded-lg border border-danger bg-surface p-4 sm:p-6"
        >
          <h4 id="delete-community-title" className="text-xl font-bold">
            Delete {community.name}?
          </h4>
          <p className="text-xs text-muted">
            {members > 1
              ? `${members.toLocaleString()} members will lose access. `
              : ""}
            All discussions will be permanently deleted.
          </p>
          {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
          <div className="flex flex-wrap gap-2">
            <Atom.Button
              variant="secondary"
              autoFocus
              onClick={() => setConfirming(false)}
            >
              Keep community
            </Atom.Button>
            <Atom.Button danger loading={pending} onClick={handleDelete}>
              Yes, delete
            </Atom.Button>
          </div>
        </div>
      )}
    </Molecule.SettingsSection>
  );
}

function ConnectionSwitch({
  community,
  setting,
  label,
  description,
}: {
  community: Community;
  setting: CommunityConnectionSetting;
  label: string;
  description: string;
}) {
  const updateCommunity = useCommunityStore((state) => state.updateCommunity);
  const [on, setOn] = useState(community[setting] !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(value: boolean) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCommunity(community.id, { [setting]: value });
      setOn(updated[setting] !== false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Molecule.SettingsRow label={label} description={description}>
        <Molecule.ReadOnlyGate action="change this">
          <Switch checked={on} loading={saving} onChange={toggle} />
        </Molecule.ReadOnlyGate>
      </Molecule.SettingsRow>
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
    </div>
  );
}

function TwitchSettings({ community }: { community: Community }) {
  const [login, setLogin] = useState(community.twitchLogin ?? null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOAuthProviders()
      .then((providers) => setEnabled(providers.includes("twitch")))
      .catch(() => setEnabled(false));
  }, []);

  if (!login && enabled === false) return null;

  async function connect() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      await startOAuth("twitch", token, community.id);
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
      await disconnectCommunityTwitch(token, community.id);
      setLogin(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.SettingsSection
      title="Twitch"
      description="Connect the community’s Twitch channel. While it’s live, members see a LIVE badge on the community."
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${oauthColors.twitch}`}
        >
          <OAuthIcon provider="twitch" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">Twitch</span>
          <span className="truncate text-xs text-muted">
            {login ? `Connected to twitch.tv/${login}` : "Not connected"}
          </span>
        </div>
        {login ? (
          <Atom.Button size="small" variant="secondary" loading={pending} onClick={disconnect}>
            Disconnect
          </Atom.Button>
        ) : (
          <Atom.Button size="small" loading={pending} disabled={enabled !== true} onClick={connect}>
            Connect
          </Atom.Button>
        )}
      </div>
      {login && (
        <div className="flex flex-col gap-4">
          <ConnectionSwitch
            community={community}
            setting="showTwitchLive"
            label="Live status"
            description="Show a LIVE badge while the channel is streaming, and a countdown to the next scheduled stream."
          />
          <ConnectionSwitch
            community={community}
            setting="showTwitchClips"
            label="Clips tab"
            description="Show the channel’s most-watched Twitch clips in a Clips tab."
          />
        </div>
      )}
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
    </Molecule.SettingsSection>
  );
}

async function discordStatus(communityId: number) {
  const { token } = useAuthStore.getState();
  if (!token) return null;
  return (await getCommunity(token, String(communityId)))?.discord ?? null;
}

function DiscordSettings({ community }: { community: Community }) {
  const [server, setServer] = useState<({ name: string } & DiscordStatus) | null>(
    community.discordGuildName
      ? {
          name: community.discordGuildName,
          online: community.discord?.online ?? null,
          inviteUrl: community.discord?.inviteUrl ?? null,
        }
      : null,
  );
  const [choice, setChoice] = useState<PendingServers | null>(() =>
    readDiscordServers(community.id),
  );
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  const [step, setStep] = useState<"pick" | "setup">("pick");
  const [checking, setChecking] = useState(false);
  const [stillOff, setStillOff] = useState(false);
  const waiting = server !== null && server.online === null;

  useEffect(() => {
    getOAuthProviders()
      .then((providers) => setEnabled(providers.includes("discord")))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(async () => {
      const discord = await discordStatus(community.id).catch(() => null);
      if (!discord) return;
      setServer((current) => current && { ...current, ...discord });
      if (discord.online !== null) setSetup(false);
    }, DISCORD_CHECK_MS);
    return () => clearInterval(timer);
  }, [waiting, community.id]);

  if (!server && !choice && enabled === false) return null;

  async function checkNow() {
    setChecking(true);
    setError(null);
    try {
      const discord = await discordStatus(community.id);
      if (!discord) return;
      setServer((current) => current && { ...current, ...discord });
      if (discord.online !== null) setSetup(false);
      setStillOff(discord.online === null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setChecking(false);
    }
  }

  async function connect() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      await startOAuth("discord", token, community.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(false);
    }
  }

  function closeChoice() {
    clearDiscordServers();
    setChoice(null);
  }

  function closeModal() {
    closeChoice();
    setSetup(false);
    setStillOff(false);
    setError(null);
  }

  async function pick(serverId: string) {
    const { token } = useAuthStore.getState();
    if (!token || !choice) return;
    setPicking(serverId);
    setError(null);
    try {
      const { name, online, inviteUrl } = await connectDiscordServer(token, choice.token, serverId);
      setServer({ name, online, inviteUrl });
      closeChoice();
      if (online === null) {
        setStep("setup");
        setSetup(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPicking(null);
    }
  }

  async function disconnect() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      await disconnectCommunityDiscord(token, community.id);
      setServer(null);
      setStillOff(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.SettingsSection
      title="Discord"
      description="Connect the community’s Discord server to show how many people are online there, with a button to join it. Only the online count and invite link are read, and nothing is added to your server."
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${oauthColors.discord}`}
        >
          <OAuthIcon provider="discord" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">Discord</span>
          <span className="truncate text-xs text-muted">
            {server
              ? `Connected to ${server.name}${
                  server.online === null ? "" : ` · ${server.online.toLocaleString()} online`
                }`
              : "Not connected"}
          </span>
        </div>
        {server ? (
          <Atom.Button size="small" variant="secondary" loading={pending} onClick={disconnect}>
            Disconnect
          </Atom.Button>
        ) : (
          <Atom.Button size="small" loading={pending} disabled={enabled !== true} onClick={connect}>
            Connect
          </Atom.Button>
        )}
      </div>
      {server && server.online === null && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-muted">
            The connection isn’t finished. To show the online count, turn on the server widget:
          </p>
          <DiscordWidgetSteps server={server.name} />
          <p className="text-xs text-muted">
            Orbis checks every 5 minutes. After you turn it on, it can take a couple of minutes to
            show up here.
          </p>
          <Atom.Button size="small" variant="secondary" loading={checking} onClick={checkNow}>
            Check now
          </Atom.Button>
          {stillOff && !setup && (
            <p className="text-xs text-muted">The widget is still off.</p>
          )}
        </div>
      )}
      {server && (
        <div className="flex flex-col gap-4">
          <ConnectionSwitch
            community={community}
            setting="showDiscordOnline"
            label="Online count"
            description="Show how many people are online in the server."
          />
          <ConnectionSwitch
            community={community}
            setting="showDiscordInvite"
            label="Join button"
            description="Link the Discord pill on the cover photo to the server’s invite, so people can join."
          />
        </div>
      )}
      {server && server.online !== null && !server.inviteUrl && (
        <p className="text-xs text-muted">
          To add a Join Discord button, pick an Invite Channel in your Discord server’s settings,
          under Engagement, then Server Widget.
        </p>
      )}
      {error && !choice && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <Modal
        open={choice !== null || setup}
        title={null}
        footer={null}
        onCancel={picking ? undefined : closeModal}
        mask={{ closable: !picking }}
        closable={!picking}
        width={440}
        centered
        destroyOnHidden
        styles={{ container: { padding: 24 } }}
      >
        {step === "setup" && server ? (
          <div className="flex flex-col gap-6">
            <Molecule.ModalHeader
              eyebrow="Connect Discord"
              title="One more step."
              description={`${server.name} is connected. To show how many people are online there, turn on its server widget in Discord.`}
            />
            <DiscordWidgetSteps server={server.name} />
            <p className="text-[13px] text-muted">
              Orbis checks every 5 minutes. Until the widget is on, you’ll see a reminder on your
              home page.
            </p>
            {stillOff && (
              <p className="text-[13px] text-muted">
                The widget is still off. If you just turned it on, give it a couple of minutes.
              </p>
            )}
            {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
            <div className="flex justify-end gap-2">
              <Atom.Button variant="secondary" onClick={closeModal}>
                Do it later
              </Atom.Button>
              <Atom.Button loading={checking} onClick={checkNow}>
                Check now
              </Atom.Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <Molecule.ModalHeader
              eyebrow="Connect Discord"
              title="Pick your server."
              description="These are the servers you own or can manage."
            />
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {choice?.options.map((option) => (
                <li key={option.id} className="flex items-center gap-3 rounded-md py-1.5">
                  <Atom.Avatar
                    size="sm"
                    label={option.name}
                    src={option.iconUrl}
                    seed={option.id}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {option.name}
                  </span>
                  <Atom.Button
                    size="small"
                    loading={picking === option.id}
                    disabled={picking !== null && picking !== option.id}
                    onClick={() => pick(option.id)}
                  >
                    Connect
                  </Atom.Button>
                </li>
              ))}
            </ul>
            {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
          </div>
        )}
      </Modal>
    </Molecule.SettingsSection>
  );
}

export function CommunitySettings({
  community,
  aside,
}: {
  community: Community;
  aside?: ReactNode;
}) {
  return (
    <SettingsTabs
      label="Community settings sections"
      aside={aside}
      tabs={[
        {
          key: "general",
          label: "General",
          icon: <SlidersHorizontal size={16} aria-hidden />,
          content: (
            <>
              <GeneralSettings community={community} />
              {community.role === "owner" && <DangerZone community={community} />}
            </>
          ),
        },
        {
          key: "admins",
          label: "Admins",
          icon: <ShieldCheck size={16} aria-hidden />,
          content: <AdminSettings community={community} />,
        },
        {
          key: "invites",
          label: "Invites",
          icon: <Ticket size={16} aria-hidden />,
          content: <InviteSettings community={community} />,
        },
        {
          key: "connections",
          label: "Connections",
          icon: <Link2 size={16} aria-hidden />,
          content: (
            <>
              <TwitchSettings community={community} />
              <DiscordSettings community={community} />
              <DiscordChannelSettings community={community} />
              <LinksSettings community={community} />
            </>
          ),
        },
      ]}
    />
  );
}

import type { ThemeMode } from "@/stores/theme-store";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type LoginCredentials = { identifier: string; password: string; turnstileToken?: string };

export type SignupDetails = {
  email: string;
  username: string;
  password: string;
  turnstileToken?: string;
};

export type Credentials = LoginCredentials | SignupDetails;

export type PresenceStatus = "online" | "idle" | "busy" | "streaming" | "offline";

export type UserStatus = Exclude<PresenceStatus, "offline" | "streaming">;

export type Profile = {
  userId: number;
  email: string;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  theme: ThemeMode;
  appearOffline: boolean;
  status: UserStatus;
  isPublic: boolean;
  showNsfw: boolean;
  showChangelog: boolean;
  isAdmin: boolean;
  isHeadAdmin: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
};

export type LoginResult = { token: string } | { twoFactorTicket: string };

export type TwoFactorSetup = { secret: string; qrCode: string };

export type CommunityRole = "owner" | "admin" | "member";

export type CommunityLinkPlatform =
  | "x"
  | "youtube"
  | "kick"
  | "instagram"
  | "tiktok"
  | "reddit"
  | "website";

export type CommunityLinks = Partial<Record<CommunityLinkPlatform, string>>;

export type Community = {
  id: number;
  name: string;
  description?: string | null;
  iconUrl: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  ownerId: number;
  isPublic: boolean;
  isVerified: boolean;
  createdAt: string;
  role?: CommunityRole | null;
  memberCount?: number;
  twitchLogin?: string | null;
  showTwitchLive?: boolean;
  showTwitchClips?: boolean;
  live?: boolean;
  nextStream?: NextStream | null;
  discordGuildName?: string | null;
  showDiscordOnline?: boolean;
  showDiscordInvite?: boolean;
  discord?: DiscordStatus | null;
  links?: CommunityLinks;
  showLibraryUpdates?: boolean;
  banned?: boolean;
};

export type CommunityPerson = {
  id: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
};

export type CommunitySearchResult = {
  id: number;
  name: string;
  description: string | null;
  iconUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  memberCount: number;
  joined: boolean;
  members: CommunityPerson[];
  mutuals: CommunityPerson[];
  mutualCount: number;
};

export const EMAIL_UNCONFIRMED_EVENT = "orbis:email-unconfirmed";
export const ACCOUNT_SUSPENDED_EVENT = "orbis:account-suspended";

export async function api(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error("Can't reach Orbis right now. Please try again.");
  }
  if (res.status === 429) {
    throw new Error(await errorMessage(res, "You’re doing that too often. Try again in a minute."));
  }
  if (res.status === 403 && typeof window !== "undefined") {
    const body = await res
      .clone()
      .json()
      .catch(() => null);
    if (body?.code === "email_unconfirmed") window.dispatchEvent(new Event(EMAIL_UNCONFIRMED_EVENT));
    if (body?.code === "account_suspended") {
      window.dispatchEvent(
        new CustomEvent(ACCOUNT_SUSPENDED_EVENT, {
          detail: typeof body.message === "string" ? `${body.message}.` : null,
        }),
      );
    }
  }
  return res;
}

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Method = "POST" | "PATCH" | "PUT" | "DELETE";

function send(token: string, path: string, method?: Method, body?: unknown) {
  return api(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

function postJson(path: string, body: unknown) {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function upload(token: string, path: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return api(path, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
}

async function errorMessage(res: Response, fallback: string) {
  const { message } = await res.json().catch(() => ({ message: null }));
  return typeof message === "string" ? `${message}.` : fallback;
}

async function authenticate(
  path: string,
  credentials: Credentials,
): Promise<{ access_token?: string; two_factor_ticket?: string }> {
  const res = await postJson(path, credentials);

  if (res.status === 401) {
    throw new Error("Invalid username, email, or password.");
  }
  if (res.status === 409) {
    throw new Error(await errorMessage(res, "That account already exists."));
  }
  if (res.status === 403) {
    throw new Error(await errorMessage(res, "We couldn’t check that you’re human. Try again."));
  }
  if (res.status === 503) {
    throw new Error(await errorMessage(res, "Something went wrong. Please try again."));
  }
  if (res.status === 400) {
    throw new Error(
      "Usernames are 3–20 characters: letters, numbers, or underscores.",
    );
  }
  if (!res.ok) throw new Error("Something went wrong. Please try again.");

  return res.json();
}

export async function signup(details: SignupDetails): Promise<string> {
  const { access_token } = await authenticate("/auth/signup", details);
  if (!access_token) throw new Error("Something went wrong. Please try again.");
  return access_token;
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const { access_token, two_factor_ticket } = await authenticate("/auth/login", credentials);
  if (two_factor_ticket) return { twoFactorTicket: two_factor_ticket };
  if (!access_token) throw new Error("Something went wrong. Please try again.");
  return { token: access_token };
}

export async function verifyTwoFactorLogin(ticket: string, code: string): Promise<string> {
  const res = await postJson("/auth/login/two-factor", { ticket, code });

  if (!res.ok) throw new Error(await errorMessage(res, "That code didn’t work. Check it and try again."));
  const { access_token } = await res.json();
  return access_token;
}

export async function setupTwoFactor(token: string): Promise<TwoFactorSetup> {
  const res = await send(token, "/users/me/two-factor/setup", "POST");

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t start setting up two-factor sign-in."));
  return res.json();
}

export async function enableTwoFactor(token: string, code: string): Promise<string[]> {
  const res = await send(token, "/users/me/two-factor/enable", "POST", { code });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t turn on two-factor sign-in."));
  const { recoveryCodes } = await res.json();
  return recoveryCodes;
}

export async function disableTwoFactor(token: string, code: string): Promise<void> {
  const res = await send(token, "/users/me/two-factor/disable", "POST", { code });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t turn off two-factor sign-in."));
}

export async function resetTwoFactor(token: string, username: string): Promise<void> {
  const res = await send(token, `/users/${encodeURIComponent(username)}/two-factor`, "DELETE");

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t remove two-factor sign-in."));
}

export async function confirmEmail(token: string): Promise<void> {
  const res = await postJson("/auth/confirm-email", { token });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t confirm your email."));
}

export async function resendConfirmation(token: string): Promise<{ confirmed: boolean }> {
  const res = await send(token, "/auth/confirm-email/resend", "POST");

  if (res.status === 429) throw new Error("You’ve asked for a few already. Try again in an hour.");
  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t send the email."));
  return res.json();
}

export async function getProfile(token: string): Promise<Profile | null> {
  const res = await send(token, "/users");

  return res.ok ? res.json() : null;
}

export type Author = {
  id: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  nickname?: string | null;
};

export type HiddenBecause =
  | { kind: "muted" }
  | { kind: "blocked" }
  | { kind: "filtered"; phrase: string };

export type CommunitySummary = Pick<Community, "id" | "name" | "iconUrl">;

export type PreviewComment = {
  id: number;
  content: string;
  linkUrl: string | null;
  spoiler: string | null;
  createdAt: string;
  author: Author;
  hiddenBecause?: HiddenBecause | null;
};

export type Post = {
  type: "post";
  id: number;
  communityId: number | null;
  mediaType?: MediaType | null;
  mediaSourceId?: string | null;
  content: string;
  linkUrl: string | null;
  spoiler: string | null;
  commentCount: number;
  likeCount: number;
  liked: boolean;
  bookmarked: boolean;
  previewComments: PreviewComment[];
  hiddenAt?: string | null;
  editedAt?: string | null;
  canDelete?: boolean;
  pinned?: boolean;
  canPin?: boolean;
  moderation?: AuthorModeration | null;
  forumThread?: { id: number; title: string; replyCount: number } | null;
  hiddenBecause?: HiddenBecause | null;
  createdAt: string;
  author: Author;
  community: CommunitySummary | null;
  wallUser: Author | null;
  quote?: QuotedItem | null;
} & ShareFields;

export type ShareTarget = { type: FeedEntry["type"]; id: number };

export type RepostedBy = { people: Author[]; total: number };

export type ShareFields = {
  repostCount: number;
  reposted: boolean;
  canRepost: boolean;
  canQuote: boolean;
  repostedBy?: RepostedBy | null;
};

export type QuotedPost = Pick<
  Post,
  | "id"
  | "content"
  | "linkUrl"
  | "spoiler"
  | "createdAt"
  | "author"
  | "community"
  | "wallUser"
  | "hiddenBecause"
> & { media: { type: MediaType; sourceId: string; title: string | null } | null };

export type QuotedItem =
  | { available: true; type: "post"; post: QuotedPost }
  | { available: true; type: "activity"; activity: Activity }
  | { available: false };

export type AuthorModeration = { remove: boolean; ban: boolean };

export type MediaType = "anime" | "manga" | "game";

export type LibraryStatus =
  | "current"
  | "completed"
  | "on_hold"
  | "dropped"
  | "planned";

export type SteamLink = {
  appId: string;
  minutes: number;
  steamId: string;
  achievements: { achieved: number; total: number } | null;
};

export type NextStream = {
  startsAt: string;
  endsAt: string | null;
  title: string | null;
  channel: string | null;
};

export type CommunityConnectionSetting =
  | "showTwitchLive"
  | "showTwitchClips"
  | "showDiscordOnline"
  | "showDiscordInvite";

export type Activity = {
  type: "activity";
  id: number;
  commentCount: number;
  likeCount: number;
  liked: boolean;
  previewComments: PreviewComment[];
  hiddenBecause?: HiddenBecause | null;
  createdAt: string;
  author: Author;
  status: LibraryStatus;
  progress: { from: number; to: number } | null;
  steam?: SteamLink | null;
  media: {
    type: MediaType;
    sourceId: string;
    title: string;
    coverImage: string | null;
    year: number | null;
  };
} & ShareFields;

export type FeedEntry = Post | Activity;

export type PublicLibraryUpdate = Pick<
  Activity,
  "id" | "createdAt" | "author" | "status" | "progress" | "media"
>;

export async function getPublicLibraryUpdates(): Promise<PublicLibraryUpdate[]> {
  const res = await api("/public/library-updates", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load library updates.");
  return res.json();
}

export type FeedContentType = FeedEntry["type"];

export type Page<T> = { items: T[]; nextCursor: string | null };

export type NumberedPage<T> = { items: T[]; total: number; page: number; pageSize: number };

export type DirectoryUser = {
  userId: number;
  username: string;
  name: string | null;
  email: string;
  emailVerifiedAt: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isAdmin: boolean;
  isHeadAdmin: boolean;
  isVerified: boolean;
  communityCount: number;
  createdAt: string;
};

export type DirectoryCommunity = {
  id: number;
  name: string;
  iconUrl: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  isVerified: boolean;
  memberCount: number;
  owner: { id: number; username: string; name: string | null; avatarUrl: string | null };
  createdAt: string;
};

export async function getDirectoryUsers(
  token: string,
  page: number,
): Promise<NumberedPage<DirectoryUser>> {
  const res = await send(token, `/admin/users?page=${page}`);

  if (!res.ok) throw new Error("Could not load users.");
  return res.json();
}

export async function getDirectoryCommunities(
  token: string,
  page: number,
): Promise<NumberedPage<DirectoryCommunity>> {
  const res = await send(token, `/admin/communities?page=${page}`);

  if (!res.ok) throw new Error("Could not load communities.");
  return res.json();
}

export type Comment = {
  id: number;
  parentId: number | null;
  content: string;
  linkUrl: string | null;
  spoiler: string | null;
  likeCount: number;
  liked: boolean;
  hidden?: "review" | "reported" | null;
  editedAt?: string | null;
  deleted?: boolean;
  canDelete?: boolean;
  hiddenBecause?: HiddenBecause | null;
  createdAt: string;
  author: Author;
};

export type Commentable = { type: FeedEntry["type"]; id: number };

export type Likeable = { type: "post" | "activity" | "comment" | "forum_post"; id: number };

export type LikeResult = { likeCount: number; liked: boolean };

export type Member = {
  userId: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  online: boolean;
  status: PresenceStatus;
  playing?: string | null;
  twitchLogin?: string | null;
  nickname: string | null;
  joinedAt: string;
  isOwner: boolean;
  isAdmin: boolean;
};

export async function updatePreferences(
  token: string,
  preferences: Partial<
    Pick<Profile, "theme" | "appearOffline" | "status" | "isPublic" | "showNsfw" | "showChangelog">
  >,
): Promise<Profile> {
  const res = await send(token, "/users/me/preferences", "PATCH", preferences);

  if (!res.ok) throw new Error("Could not save your preferences.");
  return res.json();
}

export async function uploadAvatar(
  token: string,
  file: File,
): Promise<Profile> {
  const res = await upload(token, "/users/me/avatar", file);

  if (res.status === 413) throw new Error("Pictures must be 10 MB or smaller.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not upload your picture."));
  }
  return res.json();
}

export async function removeAvatar(token: string): Promise<Profile> {
  const res = await send(token, "/users/me/avatar", "DELETE");

  if (!res.ok) throw new Error("Could not remove your picture.");
  return res.json();
}

export async function getCommunities(token: string): Promise<Community[]> {
  const res = await send(token, "/communities");

  return res.ok ? res.json() : [];
}

export function canManage(community: Community) {
  return community.role === "owner" || community.role === "admin";
}

export async function getCommunity(
  token: string | null,
  id: string,
): Promise<Community | null> {
  const res = await api(`/communities/${encodeURIComponent(id)}`, {
    headers: authHeaders(token),
  });

  return res.ok ? res.json() : null;
}

export type RailFolder = {
  type: "folder";
  id: number;
  name: string | null;
  color: string | null;
  communityIds: number[];
};

export type RailItem = { type: "community"; communityId: number } | RailFolder;

export async function getRailLayout(token: string): Promise<RailItem[]> {
  const res = await send(token, "/communities/layout");

  if (!res.ok) throw new Error("Could not load your communities.");
  return res.json();
}

export async function updateRailLayout(
  token: string,
  layout: RailItem[],
): Promise<RailItem[]> {
  const items = layout.map((item) =>
    item.type === "community"
      ? { communityId: item.communityId }
      : {
          folder: {
            ...(item.id > 0 && { id: item.id }),
            name: item.name ?? undefined,
            color: item.color ?? undefined,
            communityIds: item.communityIds,
          },
        },
  );
  const res = await send(token, "/communities/layout", "PUT", { items });

  if (!res.ok) throw new Error("Could not save your communities.");
  return res.json();
}

export async function createCommunity(
  token: string,
  name: string,
  isPublic: boolean,
): Promise<Community> {
  const res = await send(token, "/communities", "POST", { name, isPublic });

  if (res.status === 403) throw new Error(await errorMessage(res, "You can’t create more communities."));
  if (!res.ok) throw new Error("Could not create the community. Please try again.");
  return res.json();
}

export async function updateCommunity(
  token: string,
  communityId: number,
  changes: Partial<
    Pick<Community, "name" | "isPublic" | "description" | "links" | CommunityConnectionSetting>
  >,
): Promise<Community> {
  const res = await send(token, `/communities/${communityId}`, "PATCH", changes);

  if (res.status === 403) throw new Error("Only admins can change these settings.");
  if (!res.ok) throw new Error("Could not save the settings. Please try again.");
  return res.json();
}

export type CommunityImage = "icon" | "cover" | "background";

async function communityImage(image: CommunityImage, request: Promise<Response>): Promise<Community> {
  const res = await request;

  if (res.status === 403) throw new Error(`Only admins can change the ${image}.`);
  if (res.status === 413) throw new Error("Images must be 10 MB or smaller.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Could not save the ${image}.`));
  }
  return res.json();
}

export function uploadCommunityImage(
  token: string,
  communityId: number,
  image: CommunityImage,
  file: File,
): Promise<Community> {
  return communityImage(image, upload(token, `/communities/${communityId}/${image}`, file));
}

export function removeCommunityImage(
  token: string,
  communityId: number,
  image: CommunityImage,
): Promise<Community> {
  return communityImage(image, send(token, `/communities/${communityId}/${image}`, "DELETE"));
}

export async function deleteCommunity(
  token: string,
  communityId: number,
): Promise<void> {
  const res = await send(token, `/communities/${communityId}`, "DELETE");

  if (res.status === 403) throw new Error("Only the owner can delete this community.");
  if (!res.ok) throw new Error("Could not delete the community. Please try again.");
}

export async function setCommunityAdmin(
  token: string,
  communityId: number,
  userId: number,
  isAdmin: boolean,
): Promise<Member[]> {
  const res = await send(token, `/communities/${communityId}/admins/${userId}`, isAdmin ? "PUT" : "DELETE");

  if (res.status === 403) throw new Error("Only the owner can change admins.");
  if (!res.ok) throw new Error("Could not update admins. Please try again.");
  return res.json();
}

export async function searchCommunities(
  token: string,
  query: string,
): Promise<CommunitySearchResult[]> {
  const res = await send(token, withQuery("/communities/search", { q: query }));

  if (!res.ok) throw new Error("Could not search communities.");
  return res.json();
}

export type CommunityBan = {
  user: Author;
  bannedBy: Author;
  reason: string | null;
  createdAt: string;
};

export async function removeMember(
  token: string,
  communityId: number,
  userId: number,
): Promise<void> {
  const res = await send(token, `/communities/${communityId}/members/${userId}`, "DELETE");
  if (!res.ok) throw new Error(await errorMessage(res, "Could not remove them. Please try again."));
}

export async function banMember(
  token: string,
  communityId: number,
  userId: number,
  reason?: string,
): Promise<void> {
  const res = await send(token, `/communities/${communityId}/bans/${userId}`, "PUT", {
    reason: reason?.trim() || undefined,
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Could not ban them. Please try again."));
}

export async function unbanMember(
  token: string,
  communityId: number,
  userId: number,
): Promise<void> {
  const res = await send(token, `/communities/${communityId}/bans/${userId}`, "DELETE");
  if (!res.ok) throw new Error(await errorMessage(res, "Could not lift the ban. Please try again."));
}

export async function getBans(token: string, communityId: number): Promise<CommunityBan[]> {
  const res = await send(token, `/communities/${communityId}/bans`);
  if (!res.ok) throw new Error(await errorMessage(res, "Could not load banned people."));
  return res.json();
}

export async function leaveCommunity(token: string, communityId: number): Promise<void> {
  const res = await send(token, `/communities/${communityId}/leave`, "POST");

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not leave the community. Please try again."));
  }
}

export async function joinCommunity(
  token: string,
  communityId: number,
): Promise<Community> {
  const res = await send(token, `/communities/${communityId}/join`, "POST");

  if (res.status === 404) throw new Error("This community is no longer public.");
  if (res.status === 403) throw new Error(await errorMessage(res, "You can’t join more communities."));
  if (!res.ok) throw new Error("Could not join the community. Please try again.");
  return res.json();
}

export type InviteCreator = {
  id: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
};

export type Invite = {
  code: string;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  permanent: boolean;
  disabledAt: string | null;
  createdAt: string;
  creator: InviteCreator;
};

export type InviteOptions = { maxAge: number | null; maxUses: number | null };

export type InvitePreview = {
  code: string;
  expiresAt: string | null;
  creator: InviteCreator;
  community: Pick<
    Community,
    "id" | "name" | "iconUrl" | "coverUrl" | "backgroundUrl" | "isPublic" | "isVerified"
  > & {
    memberCount: number;
  };
};

export async function createInvite(
  token: string,
  communityId: number,
  options: InviteOptions,
): Promise<Invite> {
  const res = await send(token, `/communities/${communityId}/invites`, "POST", options);

  if (!res.ok) throw new Error("Could not create an invite link. Please try again.");
  return res.json();
}

export async function createPermanentInvite(
  token: string,
  communityId: number,
): Promise<Invite> {
  const res = await send(token, `/communities/${communityId}/invites/permanent`, "POST");

  if (!res.ok) throw new Error("Couldn’t create the permanent QR. Please try again.");
  return res.json();
}

export async function downloadInviteCard(
  token: string,
  communityId: number,
): Promise<Blob> {
  const res = await send(token, `/communities/${communityId}/invites/permanent/card`);

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t create the card. Please try again."));
  return res.blob();
}

export async function setInviteEnabled(
  token: string,
  communityId: number,
  code: string,
  enabled: boolean,
): Promise<Invite> {
  const res = await send(
    token,
    `/communities/${communityId}/invites/${encodeURIComponent(code)}`,
    "PATCH",
    { enabled },
  );

  if (!res.ok) throw new Error("Couldn’t update this QR. Please try again.");
  return res.json();
}

export async function getInvites(token: string, communityId: number): Promise<Invite[]> {
  const res = await send(token, `/communities/${communityId}/invites`);

  if (!res.ok) throw new Error("Could not load invites.");
  return res.json();
}

export async function revokeInvite(
  token: string,
  communityId: number,
  code: string,
): Promise<void> {
  const res = await send(token, `/communities/${communityId}/invites/${encodeURIComponent(code)}`, "DELETE");

  if (res.status === 403) throw new Error("Only admins can revoke other people’s invites.");
  if (!res.ok && res.status !== 404) {
    throw new Error("Could not revoke the invite. Please try again.");
  }
}

export async function getInvitePreview(code: string): Promise<InvitePreview | null> {
  const res = await api(`/invites/${encodeURIComponent(code)}`);

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load the invite.");
  return res.json();
}

export async function acceptInvite(token: string, code: string): Promise<Community> {
  const res = await send(token, `/invites/${encodeURIComponent(code)}`, "POST");

  if (res.status === 404) throw new Error("This invite is invalid or has expired.");
  if (res.status === 403) throw new Error(await errorMessage(res, "You can’t join more communities."));
  if (!res.ok) throw new Error("Could not join the community. Please try again.");
  return res.json();
}

function withQuery(path: string, query: Record<string, string | undefined>) {
  const params = new URLSearchParams(
    Object.entries(query).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  return params.size ? `${path}?${params}` : path;
}

export async function getPosts(
  token: string | null,
  communityId: number,
  cursor?: string,
  excludedTypes: FeedContentType[] = [],
): Promise<Page<FeedEntry>> {
  const res = await api(withQuery(`/communities/${communityId}/posts`, { cursor, exclude: excludedTypes.join(",") }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not load posts.");
  return res.json();
}

export async function getFeed(
  token: string | null,
  cursor?: string,
  excludedTypes: FeedContentType[] = [],
): Promise<Page<FeedEntry>> {
  const res = await api(withQuery("/feed", { cursor, exclude: excludedTypes.join(",") }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not load your feed.");
  return res.json();
}

export async function createWallPost(
  token: string,
  username: string,
  content: string,
  linkUrl?: string,
  spoiler?: string | null,
  quote?: ShareTarget,
): Promise<Post> {
  const res = await send(token, `/users/${encodeURIComponent(username)}/posts`, "POST", {
    content,
    linkUrl,
    spoiler,
    quote,
  });

  if (res.status === 400) {
    throw new Error(
      quote
        ? await errorMessage(res, "Write something before posting.")
        : "Write something before posting.",
    );
  }
  if (res.status === 403) {
    throw new Error(
      quote ? await errorMessage(res, "You can’t quote this.") : "Only friends can post on this wall.",
    );
  }
  if (res.status === 404 && quote) throw new Error("That post isn’t available.");
  if (!res.ok) throw new Error("Could not post. Please try again.");
  return res.json();
}

export async function searchPosts(token: string, q: string): Promise<Post[]> {
  const res = await api(withQuery("/feed/search", { q }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not search posts.");
  return res.json();
}

export async function searchCommunity(
  token: string | null,
  communityId: number,
  q: string,
): Promise<Post[]> {
  const res = await api(withQuery(`/communities/${communityId}/posts/search`, { q }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not search this community.");
  return res.json();
}

export async function searchProfile(
  token: string | null,
  username: string,
  q: string,
): Promise<Post[]> {
  const res = await api(withQuery(`/users/${encodeURIComponent(username)}/posts/search`, { q }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not search this profile.");
  return res.json();
}

export async function getUserPosts(
  token: string | null,
  username: string,
  cursor?: string,
  excludedTypes: FeedContentType[] = [],
): Promise<Page<FeedEntry>> {
  const res = await api(withQuery(`/users/${encodeURIComponent(username)}/posts`, { cursor, exclude: excludedTypes.join(",") }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not load these posts.");
  return res.json();
}

export type AnimeSpotlight = {
  type: "anime";
  sourceId: string;
  title: string;
  coverImage: string | null;
  bannerImage: string | null;
};

export async function getSpotlight(): Promise<AnimeSpotlight | null> {
  const res = await api("/library/spotlight");
  if (!res.ok) return null;
  return res.json();
}

export async function getSpotlights(): Promise<AnimeSpotlight[]> {
  const res = await api("/library/spotlights");
  if (!res.ok) return [];
  return res.json();
}

export async function getMediaPosts(
  token: string | null,
  type: MediaType,
  sourceId: string,
  cursor?: string,
  excludedTypes: FeedContentType[] = [],
): Promise<Page<FeedEntry>> {
  const res = await api(
    withQuery(`/library/media/${type}/${encodeURIComponent(sourceId)}/posts`, { cursor, exclude: excludedTypes.join(",") }),
    { headers: authHeaders(token) },
  );

  if (!res.ok) throw new Error("Could not load these posts.");
  return res.json();
}

export async function createMediaPost(
  token: string,
  type: MediaType,
  sourceId: string,
  content: string,
  linkUrl?: string,
  spoiler?: string | null,
): Promise<Post> {
  const res = await send(
    token,
    `/library/media/${type}/${encodeURIComponent(sourceId)}/posts`,
    "POST",
    { content, linkUrl, spoiler },
  );

  if (res.status === 400) throw new Error("Write something before posting.");
  if (!res.ok) throw new Error("Could not post. Please try again.");
  return res.json();
}

export async function createPost(
  token: string,
  communityId: number,
  content: string,
  linkUrl?: string,
  spoiler?: string | null,
  quote?: ShareTarget,
): Promise<Post> {
  const res = await send(token, `/communities/${communityId}/posts`, "POST", {
    content,
    linkUrl,
    spoiler,
    quote,
  });

  if (res.status === 400) {
    throw new Error(
      quote
        ? await errorMessage(res, "Write something before posting.")
        : "Write something before posting.",
    );
  }
  if (res.status === 403 && quote) throw new Error(await errorMessage(res, "You can’t quote this."));
  if (res.status === 404 && quote) throw new Error("That post isn’t available.");
  if (!res.ok) throw new Error("Could not post. Please try again.");
  return res.json();
}

export async function getMembers(
  token: string | null,
  communityId: number,
): Promise<Member[]> {
  const res = await api(`/communities/${communityId}/members`, {
    headers: authHeaders(token),
  });

  return res.ok ? res.json() : [];
}

export async function setShowLibraryUpdates(
  token: string,
  communityId: number,
  show: boolean,
): Promise<{ showLibraryUpdates: boolean }> {
  const res = await send(token, `/communities/${communityId}/library-updates`, "PATCH", { show });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t save that. Please try again."));
  return res.json();
}

export async function setNickname(
  token: string,
  communityId: number,
  nickname: string | null,
): Promise<{ nickname: string | null }> {
  const res = await api(`/communities/${communityId}/nickname`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t save your nickname. Please try again."));
  return res.json();
}

export type FriendUser = {
  userId: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  isVerified?: boolean;
};

export type FriendSuggestion = FriendUser & {
  reason: string;
  mutualFriends: FriendUser[];
};

export type Friend = FriendUser & {
  online: boolean;
  status: PresenceStatus;
  playing?: string | null;
  twitchLogin?: string | null;
};

export type FriendList = {
  friends: Friend[];
  incoming: FriendUser[];
  outgoing: FriendUser[];
};

export type FriendTarget = { userId: number } | { username: string };

export async function searchPeople(token: string, query: string): Promise<FriendUser[]> {
  const res = await send(token, withQuery("/friends/search", { q: query }));

  if (!res.ok) throw new Error("Could not search people.");
  return res.json();
}

export async function getFriends(token: string): Promise<FriendList> {
  const res = await send(token, "/friends");

  if (!res.ok) throw new Error("Could not load your friends.");
  return res.json();
}

export async function getFriendSuggestions(token: string): Promise<FriendSuggestion[]> {
  const res = await send(token, "/friends/suggestions");

  if (!res.ok) throw new Error("Could not load suggestions.");
  return res.json();
}

export async function dismissSuggestion(token: string, userId: number): Promise<void> {
  const res = await send(token, `/friends/suggestions/${userId}`, "DELETE");

  if (!res.ok) throw new Error("Couldn’t remove that suggestion. Try again.");
}

export async function addFriend(
  token: string,
  target: FriendTarget,
  fromSuggestion = false,
): Promise<void> {
  const res = await send(token, "/friends", "POST", { ...target, ...(fromSuggestion && { fromSuggestion }) });

  if (res.status === 404) {
    throw new Error("No one with that username is on Orbis.");
  }
  if (res.status === 400 || res.status === 409) {
    throw new Error(await errorMessage(res, "That isn't a valid username."));
  }
  if (!res.ok) throw new Error("Could not send the request. Please try again.");
}

export async function removeFriend(token: string, userId: number): Promise<void> {
  const res = await send(token, `/friends/${userId}`, "DELETE");

  if (!res.ok && res.status !== 404) {
    throw new Error("Could not update your friends. Please try again.");
  }
}

export type ChatPerson = FriendUser;

export type ChatReply = {
  id: number;
  senderId: number;
  sender: ChatPerson;
  text: string;
  hiddenBecause?: HiddenBecause | null;
};

export type ChatReaction = { emoji: string; userIds: number[] };

export type ChatMessage = {
  id: number;
  senderId: number;
  sender: ChatPerson;
  text: string;
  system: boolean;
  sentAt: string;
  editedAt: string | null;
  replyTo: ChatReply | null;
  reactions: ChatReaction[];
  hiddenBecause?: HiddenBecause | null;
};

export type Conversation = {
  id: number;
  isGroup: boolean;
  name: string | null;
  creatorId: number | null;
  members: ChatPerson[];
  lastText: string;
  lastSenderId: number | null;
  lastSystem: boolean;
  lastAt: string;
  unread: number;
  status: "accepted" | "request";
  muted?: boolean;
  canMessage?: boolean;
};

export type ChatMember = ChatPerson & { readAt: string | null };

export type ChatHistory = {
  messages: ChatMessage[];
  members: ChatMember[];
  hasMore: boolean;
  muted?: boolean;
  canMessage?: boolean;
};

export async function getConversations(token: string): Promise<Conversation[]> {
  const res = await send(token, "/messages");

  if (!res.ok) throw new Error("Could not load your messages.");
  return res.json();
}

export async function openDirectChat(token: string, userId: number): Promise<Conversation> {
  const res = await send(token, `/messages/direct/${userId}`, "POST");

  if (!res.ok) throw new Error(await errorMessage(res, "Could not open this chat."));
  return res.json();
}

export async function createGroupChat(
  token: string,
  userIds: number[],
  name?: string,
): Promise<Conversation> {
  const res = await send(token, "/messages/groups", "POST", { userIds, name });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not create the group."));
  return res.json();
}

export async function getChatHistory(
  token: string,
  id: number,
  before?: number,
): Promise<ChatHistory> {
  const query = before === undefined ? "" : `?before=${before}`;
  const res = await send(token, `/messages/${id}${query}`);

  if (!res.ok) throw new Error("Could not load this chat.");
  return res.json();
}

export async function sendMessage(
  token: string,
  id: number,
  text: string,
  replyToId?: number,
): Promise<ChatMessage> {
  const res = await send(token, `/messages/${id}`, "POST", { text, replyToId });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not send your message."));
  }
  return res.json();
}

export async function editMessage(
  token: string,
  id: number,
  messageId: number,
  text: string,
): Promise<ChatMessage> {
  const res = await send(token, `/messages/${id}/messages/${messageId}`, "PATCH", { text });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not edit your message."));
  }
  return res.json();
}

export async function reactToMessage(
  token: string,
  id: number,
  messageId: number,
  emoji: string,
): Promise<ChatMessage> {
  const res = await send(token, `/messages/${id}/messages/${messageId}/reaction`, "POST", { emoji });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not react to this message."));
  }
  return res.json();
}

export async function markMessagesRead(token: string, id: number): Promise<void> {
  await send(token, `/messages/${id}/read`, "POST");
}

export async function acceptMessageRequest(token: string, id: number): Promise<void> {
  const res = await send(token, `/messages/${id}/accept`, "POST");

  if (!res.ok && res.status !== 404) {
    throw new Error("Could not accept the request. Please try again.");
  }
}

export async function declineMessageRequest(token: string, id: number): Promise<void> {
  const res = await send(token, `/messages/${id}`, "DELETE");

  if (!res.ok && res.status !== 404) {
    throw new Error("Could not delete the request. Please try again.");
  }
}

export async function renameGroupChat(token: string, id: number, name: string): Promise<void> {
  const res = await send(token, `/messages/${id}`, "PATCH", { name });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not rename the group."));
}

export async function addGroupMembers(
  token: string,
  id: number,
  userIds: number[],
): Promise<void> {
  const res = await send(token, `/messages/${id}/members`, "POST", { userIds });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not add those people."));
}

export async function removeGroupMember(
  token: string,
  id: number,
  userId: number,
): Promise<void> {
  const res = await send(token, `/messages/${id}/members/${userId}`, "DELETE");

  if (!res.ok) throw new Error(await errorMessage(res, "Could not update the group."));
}

export async function setConversationMuted(
  token: string,
  id: number,
  muted: boolean,
): Promise<{ muted: boolean }> {
  const res = await send(token, `/messages/${id}/mute`, muted ? "POST" : "DELETE");

  if (!res.ok) {
    throw new Error(
      await errorMessage(
        res,
        muted ? "Couldn’t mute this chat. Try again." : "Couldn’t unmute this chat. Try again.",
      ),
    );
  }
  return res.json();
}

export async function getCommunityPost(
  token: string | null,
  communityId: number,
  postId: number,
): Promise<Post> {
  const res = await api(`/communities/${communityId}/posts/${postId}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("That post isn’t available.");
  return res.json();
}

export async function getCommunityActivity(
  token: string | null,
  communityId: number,
  activityId: number,
): Promise<Activity> {
  const res = await api(`/communities/${communityId}/posts/activities/${activityId}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("That library update isn’t available.");
  return res.json();
}

export async function getProfilePost(
  token: string | null,
  username: string,
  postId: number,
): Promise<Post> {
  const res = await api(`/users/${encodeURIComponent(username)}/posts/${postId}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("That post isn’t available.");
  return res.json();
}

export async function getProfileActivity(
  token: string | null,
  username: string,
  activityId: number,
): Promise<Activity> {
  const res = await api(`/users/${encodeURIComponent(username)}/posts/activities/${activityId}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("That library update isn’t available.");
  return res.json();
}

export async function getMediaPost(
  token: string | null,
  type: MediaType,
  sourceId: string,
  postId: number,
): Promise<Post> {
  const res = await api(`/library/media/${type}/${encodeURIComponent(sourceId)}/posts/${postId}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("That post isn’t available.");
  return res.json();
}

export async function updatePost(
  token: string,
  postId: number,
  content: string,
  linkUrl?: string,
  spoiler?: string | null,
): Promise<Post> {
  const res = await send(token, `/posts/${postId}`, "PATCH", { content, linkUrl, spoiler });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not save the post."));
  return res.json();
}

export async function deletePost(token: string, postId: number): Promise<void> {
  const res = await send(token, `/posts/${postId}`, "DELETE");

  if (!res.ok) throw new Error(await errorMessage(res, "Could not delete the post."));
}

export async function setPostPinned(
  token: string,
  postId: number,
  pinned: boolean,
): Promise<void> {
  const res = await send(token, `/posts/${postId}/pin`, pinned ? "PUT" : "DELETE");

  if (!res.ok) {
    throw new Error(
      await errorMessage(res, pinned ? "Could not pin the post." : "Could not unpin the post."),
    );
  }
}

export async function getComments(
  token: string | null,
  { type, id }: Commentable,
): Promise<Comment[]> {
  const res = await api(withQuery("/comments", { type, id: String(id) }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not load comments.");
  return res.json();
}

export async function createComment(
  token: string,
  { type, id }: Commentable,
  content: string,
  parentId?: number,
  linkUrl?: string,
  spoiler?: string | null,
): Promise<Comment> {
  const res = await send(token, "/comments", "POST", { type, id, parentId, content, linkUrl, spoiler });

  if (res.status === 400) throw new Error("Write something before commenting.");
  if (!res.ok) throw new Error("Could not post the comment. Please try again.");
  return res.json();
}

export async function updateComment(
  token: string,
  commentId: number,
  content: string,
  linkUrl?: string,
  spoiler?: string | null,
): Promise<Comment> {
  const res = await send(token, `/comments/${commentId}`, "PATCH", { content, linkUrl, spoiler });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not save the comment."));
  return res.json();
}

export async function deleteComment(token: string, commentId: number): Promise<void> {
  const res = await send(token, `/comments/${commentId}`, "DELETE");

  if (!res.ok) throw new Error(await errorMessage(res, "Could not delete the comment."));
}

export async function setLike(
  token: string,
  { type, id }: Likeable,
  liked: boolean,
): Promise<LikeResult> {
  const res = await send(token, "/likes", "PUT", { type, id, liked });

  if (!res.ok) throw new Error("Could not save your like.");
  return res.json();
}

export async function setBookmark(
  token: string,
  postId: number,
  bookmarked: boolean,
): Promise<{ bookmarked: boolean }> {
  const res = await send(token, "/bookmarks", "PUT", { type: "post", id: postId, bookmarked });

  if (!res.ok) throw new Error("Could not update your bookmarks.");
  return res.json();
}

export type RepostResult = { reposted: boolean; repostCount: number };

export type Reposter = Author & { repostedAt: string };

export async function repost(
  token: string,
  { type, id }: ShareTarget,
  communityId: number | null,
): Promise<RepostResult> {
  const res = await send(token, `/reposts/${type}/${id}`, "PUT", { communityId });

  if (res.status === 403) throw new Error(await errorMessage(res, "You can’t repost this."));
  if (res.status === 404) throw new Error("That post isn’t available.");
  if (!res.ok) throw new Error("Could not repost. Please try again.");
  return res.json();
}

export async function undoRepost(token: string, { type, id }: ShareTarget): Promise<RepostResult> {
  const res = await send(token, `/reposts/${type}/${id}`, "DELETE");

  if (!res.ok) throw new Error("Could not undo your repost. Please try again.");
  return res.json();
}

export async function getReposters(
  token: string,
  { type, id }: ShareTarget,
  cursor?: string,
): Promise<Page<Reposter>> {
  const res = await api(withQuery(`/reposts/${type}/${id}/people`, { cursor }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not load reposts.");
  return res.json();
}

export async function getQuotes(
  token: string,
  { type, id }: ShareTarget,
  cursor?: string,
): Promise<Page<Post>> {
  const res = await api(withQuery(`/reposts/${type}/${id}/quotes`, { cursor }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not load quotes.");
  return res.json();
}

export async function getBookmarks(token: string | null, cursor?: string): Promise<Page<Post>> {
  const res = await api(withQuery("/bookmarks", { cursor }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not load your bookmarks.");
  return res.json();
}

export async function searchBookmarks(token: string | null, q: string): Promise<Post[]> {
  const res = await api(withQuery("/bookmarks/search", { q }), {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Could not search your bookmarks.");
  return res.json();
}

export type TagSummary = { name: string; display: string };

export type TagWindow = "day" | "week";

export type TrendingTag = TagSummary & { people: number };

export type Tag = TagSummary & { following: boolean; people: number; window: TagWindow };

export type TagSearchResult = TagSummary & { uses: number };

export type TagItem =
  | { kind: "post"; createdAt: string; post: Post }
  | {
      kind: "comment";
      createdAt: string;
      comment: Comment;
      target: {
        type: Commentable["type"];
        id: number;
        author: Author;
        community: CommunitySummary | null;
        media: { type: MediaType; sourceId: string } | null;
        wallUser: Author | null;
      };
    }
  | {
      kind: "forum_post";
      createdAt: string;
      forumPost: ForumPost;
      thread: { id: number; title: string; categoryId: number; community: CommunitySummary };
    };

export type TagPage = { tag: Tag; items: TagItem[]; nextCursor: string | null };

function tagPath(name: string, path = "") {
  return `/tags/${encodeURIComponent(name)}${path}`;
}

export async function getTrendingTags(
  token: string | null,
): Promise<{ window: TagWindow; tags: TrendingTag[] }> {
  const res = await api("/tags/trending", { headers: authHeaders(token) });

  if (!res.ok) throw new Error("Could not load trending tags.");
  return res.json();
}

export async function getFollowedTags(token: string | null): Promise<TagSummary[]> {
  const res = await api("/tags/following", { headers: authHeaders(token) });

  if (!res.ok) throw new Error("Could not load the tags you follow.");
  const { tags } = await res.json();
  return tags;
}

export async function searchTags(token: string | null, q: string): Promise<TagSearchResult[]> {
  const res = await api(withQuery("/tags/search", { q }), { headers: authHeaders(token) });

  if (!res.ok) throw new Error("Could not search tags.");
  const { tags } = await res.json();
  return tags;
}

export async function getTag(
  token: string | null,
  name: string,
  cursor?: string,
): Promise<TagPage | null> {
  const res = await api(withQuery(tagPath(name, "/items"), { cursor }), {
    headers: authHeaders(token),
  });

  if (res.status === 400) return null;
  if (!res.ok) throw new Error("Could not load this tag.");
  return res.json();
}

export async function setTagFollowing(
  token: string,
  name: string,
  following: boolean,
): Promise<{ following: boolean }> {
  const res = await send(token, tagPath(name, "/follow"), following ? "POST" : "DELETE");

  if (!res.ok) {
    throw new Error(
      await errorMessage(res, following ? "Could not follow this tag." : "Could not unfollow this tag."),
    );
  }
  return res.json();
}

export type Stats = {
  members: number;
  communities: number;
  posts: number;
  comments: number;
};

export async function getStats(): Promise<Stats> {
  const res = await api("/stats");

  if (!res.ok) throw new Error("Could not load statistics.");
  return res.json();
}

export type ReportCategory = "bug" | "idea" | "other";

export type ReportStatus = "todo" | "in_progress" | "done";

export type Report = {
  id: number;
  category: ReportCategory;
  status: ReportStatus;
  message: string;
  pageUrl: string | null;
  resolutionNote: string | null;
  hiddenAt?: string | null;
  assignee?: Author | null;
  commentCount?: number;
  createdAt: string;
  author: Author;
};

export type ReportAdmin = Author & {
  isHeadAdmin: boolean;
  online: boolean;
  status?: PresenceStatus;
  twitchLogin?: string | null;
};

export type ContentReportTarget = "post" | "comment" | "user" | "community" | "forum_post";
export type ContentReportReason = "spam" | "harassment" | "inappropriate" | "other";

export type ReportedItem = {
  type: ContentReportTarget;
  id: number;
  target: {
    title: string;
    excerpt: string | null;
    author: Author | null;
    link: string;
  } | null;
  count: number;
  reasons: Partial<Record<ContentReportReason, number>>;
  reports: {
    id: number;
    reason: ContentReportReason;
    details: string | null;
    createdAt: string;
    reporter: Author;
  }[];
  lastReportedAt: string;
};

export async function reportContent(
  token: string,
  report: { type: ContentReportTarget; id: number; reason: ContentReportReason; details?: string },
): Promise<void> {
  const res = await send(token, "/content-reports", "POST", report);

  if (res.status === 409 || res.status === 400 || res.status === 404) {
    throw new Error(await errorMessage(res, "Could not send the report."));
  }
  if (!res.ok) throw new Error("Could not send the report. Please try again.");
}

export async function getReportedItems(token: string): Promise<ReportedItem[]> {
  const res = await send(token, "/content-reports");

  if (!res.ok) throw new Error("Could not load reported content.");
  return res.json();
}

export async function resolveReportedItem(
  token: string,
  item: { type: ContentReportTarget; id: number },
  resolution: "resolved" | "dismissed",
): Promise<void> {
  const res = await send(token, "/content-reports/resolution", "PUT", { ...item, resolution });

  if (!res.ok && res.status !== 404) {
    throw new Error("Could not update the report. Please try again.");
  }
}

export type ReportComment = {
  id: number;
  content: string;
  createdAt: string;
  author: Author;
};

export async function getReportAdmins(token: string): Promise<ReportAdmin[]> {
  const res = await send(token, "/reports/admins");

  if (!res.ok) throw new Error("Could not load admins.");
  return res.json();
}

export async function assignReport(
  token: string,
  reportId: number,
  assigneeId: number | null,
): Promise<Report> {
  const res = await send(token, `/reports/${reportId}/assignee`, "PUT", { assigneeId });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not assign the report."));
  return res.json();
}

export async function getReportComments(token: string, reportId: number): Promise<ReportComment[]> {
  const res = await send(token, `/reports/${reportId}/comments`);

  if (!res.ok) throw new Error("Could not load comments.");
  return res.json();
}

export async function addReportComment(
  token: string,
  reportId: number,
  content: string,
): Promise<ReportComment> {
  const res = await send(token, `/reports/${reportId}/comments`, "POST", { content });

  if (!res.ok) throw new Error("Could not post the comment. Please try again.");
  return res.json();
}

export async function submitReport(
  token: string,
  report: { category: ReportCategory; message: string; pageUrl: string },
): Promise<{ id: number }> {
  const res = await send(token, "/reports", "POST", report);

  if (!res.ok) throw new Error("Could not send your report. Please try again.");
  return res.json();
}

export async function getMyReports(token: string): Promise<Report[]> {
  const res = await send(token, "/reports/mine");

  if (!res.ok) throw new Error("Could not load your reports.");
  return res.json();
}

export async function getReports(token: string, hidden = false): Promise<Report[]> {
  const res = await send(token, hidden ? "/reports?hidden=true" : "/reports");

  if (res.status === 403) throw new Error("Only site admins can see reports.");
  if (!res.ok) throw new Error("Could not load reports.");
  return res.json();
}

export async function searchReports(token: string, query: string): Promise<Report[]> {
  const res = await send(token, withQuery("/reports/search", { q: query }));

  if (!res.ok) throw new Error("Could not search tickets.");
  return res.json();
}

export async function updateReportStatus(
  token: string,
  reportId: number,
  status: ReportStatus,
  note?: string,
): Promise<Report> {
  const res = await send(token, `/reports/${reportId}`, "PATCH", { status, note });

  if (!res.ok) throw new Error("Could not move the report. Please try again.");
  return res.json();
}

export async function getReport(token: string, reportId: number): Promise<Report | null> {
  const res = await send(token, `/reports/${reportId}`);

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load the report.");
  return res.json();
}

export type ReportWebhook = { url: string | null };

export async function getReportWebhook(token: string): Promise<ReportWebhook> {
  const res = await send(token, "/reports/webhook");

  if (!res.ok) throw new Error("Could not load the Discord webhook.");
  return res.json();
}

export async function setReportWebhook(
  token: string,
  webhook: { url: string } | null,
): Promise<ReportWebhook> {
  const res = await send(token, "/reports/webhook", webhook ? "PUT" : "DELETE", webhook ?? undefined);

  if (res.status === 400) throw new Error(await errorMessage(res, "Check the webhook and site URL."));
  if (res.status === 403) throw new Error("Only the head admin can change the webhook.");
  if (!res.ok) throw new Error("Could not save the webhook. Please try again.");
  return res.json();
}

export async function setReportHidden(
  token: string,
  reportId: number,
  hidden: boolean,
): Promise<Report> {
  const res = await send(token, `/reports/${reportId}/hidden`, hidden ? "PUT" : "DELETE");

  if (!res.ok) {
    throw new Error(
      hidden ? "Could not hide the report. Please try again." : "Could not restore the report. Please try again.",
    );
  }
  return res.json();
}

export type NotificationType =
  | "post_comment"
  | "comment_reply"
  | "friend_request"
  | "friend_accepted"
  | "report_status"
  | "report_assigned"
  | "report_comment"
  | "wall_post"
  | "mention"
  | "forum_reply"
  | "forum_quote"
  | "repost"
  | "quote";

export type Notification = {
  id: number;
  type: NotificationType;
  message: string;
  link: string;
  readAt: string | null;
  createdAt: string;
  actor: Author | null;
};

export type NotificationFilter = "all" | "comments" | "friends" | "reports";

export type NotificationQuery = {
  cursor?: string;
  q?: string;
  filter?: NotificationFilter;
  unread?: boolean;
};

export async function getNotifications(
  token: string,
  { cursor, q, filter, unread }: NotificationQuery = {},
): Promise<Page<Notification>> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (q) params.set("q", q);
  if (filter && filter !== "all") params.set("filter", filter);
  if (unread) params.set("unread", "true");
  const query = params.toString();

  const res = await send(token, `/notifications${query ? `?${query}` : ""}`);

  if (!res.ok) throw new Error("Could not load notifications.");
  return res.json();
}

export async function getUnreadCount(token: string): Promise<number> {
  const res = await send(token, "/notifications/unread");

  if (!res.ok) throw new Error("Could not load notifications.");
  const { unreadCount } = await res.json();
  return unreadCount;
}

export async function markNotificationRead(token: string, id: number): Promise<void> {
  await send(token, `/notifications/${id}/read`, "POST");
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await send(token, "/notifications/read", "POST");
}

export type OnboardingStep =
  | "avatar"
  | "community"
  | "post"
  | "comment"
  | "friend"
  | "feedback"
  | "library";

export type Onboarding = {
  tourCompleted: boolean;
  checklistDismissed: boolean;
  completedTours: string[];
  steps: Record<OnboardingStep, boolean>;
  used: { steam: boolean; connections: boolean; folders: boolean; twoFactor: boolean };
};

export async function getOnboarding(token: string): Promise<Onboarding> {
  const res = await send(token, "/users/me/onboarding");

  if (!res.ok) throw new Error("Could not load your checklist.");
  return res.json();
}

export async function updateOnboarding(
  token: string,
  changes: {
    tourCompleted?: boolean;
    checklistDismissed?: boolean;
    completedTour?: string;
    resetTours?: boolean;
  },
): Promise<Onboarding> {
  const res = await send(token, "/users/me/onboarding", "PATCH", changes);

  if (!res.ok) throw new Error("Could not save your checklist.");
  return res.json();
}

export type SuspensionDuration = "1d" | "7d" | "30d" | "permanent";

export type ProfileSuspension = { until: string | null; reason: string | null };

export async function setAccountSuspension(
  token: string,
  username: string,
  suspension: { duration: SuspensionDuration; reason?: string } | null,
): Promise<ProfileSuspension | null> {
  const res = await send(
    token,
    `/users/${encodeURIComponent(username)}/suspension`,
    suspension ? "PUT" : "DELETE",
    suspension ?? undefined,
  );

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not update the suspension. Please try again."));
  }
  return (await res.json()).suspension;
}

export type PublicProfile = {
  userId: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  isAdmin: boolean;
  isHeadAdmin: boolean;
  isVerified: boolean;
  isPublic: boolean;
  restricted: boolean;
  blocked?: boolean;
  muted?: boolean;
  suspension?: ProfileSuspension | null;
  twoFactorEnabled?: boolean | null;
  hasClips: boolean;
  twitchLogin?: string | null;
  nextStream?: NextStream | null;
  createdAt: string;
  online: boolean;
  status: PresenceStatus;
  friendCount: number;
  postCount: number;
  communityCount: number;
  communities: {
    id: number;
    name: string;
    iconUrl: string | null;
    coverUrl: string | null;
    isVerified: boolean;
    memberCount: number;
    isOwner: boolean;
  }[];
  friends: {
    userId: number;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    isVerified: boolean;
    online: boolean;
    status: PresenceStatus;
    playing?: string | null;
    twitchLogin?: string | null;
  }[];
  library: {
    id: number;
    mediaType: MediaType;
    sourceId: string;
    title: string;
    coverImage: string | null;
    year: number | null;
    status: LibraryStatus;
    progress: number;
    total: number | null;
    steam?: SteamLink | null;
  }[];
};

export async function getPublicProfile(
  token: string | null,
  username: string,
): Promise<PublicProfile | null> {
  const res = await api(`/users/${encodeURIComponent(username)}`, {
    headers: authHeaders(token),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load this profile.");
  return res.json();
}

export type BlockedPerson = Author & { blockedAt: string };

export type MutedPerson = Author & { mutedAt: string };

export type KeywordFilter = {
  id: number;
  phrase: string;
  expiresAt: string | null;
  createdAt: string;
};

export type KeywordFilterDuration = "forever" | "day" | "week" | "month";

export async function getBlockedPeople(token: string): Promise<BlockedPerson[]> {
  const res = await send(token, "/blocks");

  if (!res.ok) throw new Error("Could not load the people you blocked.");
  return (await res.json()).people;
}

export async function setUserBlocked(
  token: string,
  username: string,
  blocked: boolean,
): Promise<{ blocked: boolean }> {
  const res = await send(token, `/users/${encodeURIComponent(username)}/block`, blocked ? "POST" : "DELETE");

  if (!res.ok) {
    throw new Error(
      await errorMessage(
        res,
        blocked ? "Couldn’t block them. Try again." : "Couldn’t unblock them. Try again.",
      ),
    );
  }
  return res.json();
}

export async function getMutedPeople(token: string): Promise<MutedPerson[]> {
  const res = await send(token, "/mutes");

  if (!res.ok) throw new Error("Could not load the people you muted.");
  return (await res.json()).people;
}

export async function setUserMuted(
  token: string,
  username: string,
  muted: boolean,
): Promise<{ muted: boolean }> {
  const res = await send(token, `/users/${encodeURIComponent(username)}/mute`, muted ? "POST" : "DELETE");

  if (!res.ok) {
    throw new Error(
      await errorMessage(
        res,
        muted ? "Couldn’t mute them. Try again." : "Couldn’t unmute them. Try again.",
      ),
    );
  }
  return res.json();
}

export async function getKeywordFilters(token: string): Promise<KeywordFilter[]> {
  const res = await send(token, "/keyword-filters");

  if (!res.ok) throw new Error("Could not load your keyword filters.");
  return (await res.json()).filters;
}

export async function addKeywordFilter(
  token: string,
  phrase: string,
  duration: KeywordFilterDuration,
): Promise<KeywordFilter> {
  const res = await send(token, "/keyword-filters", "POST", { phrase, duration });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t add that filter. Try again."));
  return res.json();
}

export async function removeKeywordFilter(token: string, id: number): Promise<void> {
  const res = await send(token, `/keyword-filters/${id}`, "DELETE");

  if (!res.ok && res.status !== 404) {
    throw new Error("Couldn’t remove that filter. Try again.");
  }
}

export async function setSiteAdmin(
  token: string,
  username: string,
  isAdmin: boolean,
): Promise<boolean> {
  const res = await send(token, `/users/${encodeURIComponent(username)}/admin`, isAdmin ? "PUT" : "DELETE");

  if (res.status === 403) throw new Error("Only the head admin can change site admins.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not update admin access. Please try again."));
  }
  return (await res.json()).isAdmin;
}

export async function setProfileVerified(
  token: string,
  username: string,
  isVerified: boolean,
): Promise<boolean> {
  const res = await send(
    token,
    `/users/${encodeURIComponent(username)}/verified`,
    isVerified ? "PUT" : "DELETE",
  );

  if (res.status === 403) throw new Error("Only the head admin can verify profiles.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not update verification. Please try again."));
  }
  return (await res.json()).isVerified;
}

export async function setCommunityVerified(
  token: string,
  communityId: number,
  isVerified: boolean,
): Promise<boolean> {
  const res = await send(token, `/communities/${communityId}/verified`, isVerified ? "PUT" : "DELETE");

  if (res.status === 403) throw new Error("Only the head admin can verify communities.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not update verification. Please try again."));
  }
  return (await res.json()).isVerified;
}

export async function uploadUserCover(token: string, file: File): Promise<Profile> {
  const res = await upload(token, "/users/me/cover", file);

  if (res.status === 413) throw new Error("Covers must be 10 MB or smaller.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not upload your cover."));
  }
  return res.json();
}

export async function removeUserCover(token: string): Promise<Profile> {
  const res = await send(token, "/users/me/cover", "DELETE");

  if (!res.ok) throw new Error("Could not remove your cover.");
  return res.json();
}

export async function uploadUserBackground(token: string, file: File): Promise<Profile> {
  const res = await upload(token, "/users/me/background", file);

  if (res.status === 413) throw new Error("Wallpapers must be 10 MB or smaller.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not upload your wallpaper."));
  }
  return res.json();
}

export async function removeUserBackground(token: string): Promise<Profile> {
  const res = await send(token, "/users/me/background", "DELETE");

  if (!res.ok) throw new Error("Could not remove your wallpaper.");
  return res.json();
}

export type MediaResult = {
  id: string;
  type: MediaType;
  sourceId: string;
  title: string;
  coverImage: string | null;
  year: number | null;
  score: number | null;
  inLibrary: boolean;
};

export type LibraryEntry = {
  id: number;
  mediaId: string;
  mediaType: MediaType;
  sourceId: string;
  title: string;
  coverImage: string | null;
  year: number | null;
  status: LibraryStatus;
  progress: number;
  total: number | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  steam?: SteamLink | null;
};

export async function searchLibrary(
  token: string,
  q: string,
): Promise<Record<MediaType, MediaResult[]>> {
  const res = await send(token, withQuery("/library/search", { q }));

  if (!res.ok) throw new Error(await errorMessage(res, "Search isn’t available right now."));
  return res.json();
}

export type MediaListName = "trending" | "season" | "top" | "upcoming";

export type MediaListItem = MediaResult & {
  bannerImage: string | null;
  releaseStatus: string | null;
  genres: string[];
  details: Record<string, unknown>;
  entry: { id: number; status: LibraryStatus; isPublic: boolean } | null;
};

export async function getMediaList(
  token: string | null,
  type: MediaType,
  list: MediaListName,
): Promise<MediaListItem[]> {
  const res = await api(`/library/lists/${type}/${list}`, { headers: authHeaders(token) });

  if (!res.ok) throw new Error(await errorMessage(res, "This list isn’t available right now."));
  return res.json();
}

export async function getLibrary(token: string): Promise<LibraryEntry[]> {
  const res = await send(token, "/library");

  if (!res.ok) throw new Error("Could not load your library.");
  return res.json();
}

export async function addToLibrary(
  token: string,
  item: {
    type: MediaType;
    sourceId: string;
    status: LibraryStatus;
    isPublic: boolean;
    progress?: number;
  },
): Promise<LibraryEntry> {
  const res = await send(token, "/library", "POST", item);

  if (!res.ok) throw new Error(await errorMessage(res, "Could not add it to your library."));
  return res.json();
}

export async function updateLibraryEntry(
  token: string,
  id: number,
  changes: { status?: LibraryStatus; isPublic?: boolean; progress?: number },
): Promise<LibraryEntry> {
  const res = await send(token, `/library/${id}`, "PATCH", changes);

  if (!res.ok) throw new Error("Could not update your library.");
  return res.json();
}

export type MediaProfile = Omit<MediaResult, "inLibrary"> & {
  altTitles: string[];
  synopsis: string | null;
  bannerImage: string | null;
  releaseStatus: string | null;
  genres: string[];
  source: { provider: string; url: string } | null;
  details: Record<string, unknown>;
  entry: LibraryEntry | null;
  members: { status: LibraryStatus; user: Author }[];
};

export class AdultTitleError extends Error {}

export async function getMediaProfile(
  token: string | null,
  type: string,
  sourceId: string,
): Promise<MediaProfile | null> {
  const res = await api(`/library/media/${encodeURIComponent(type)}/${encodeURIComponent(sourceId)}`, {
    headers: authHeaders(token),
  });

  if (res.status === 404 || res.status === 400) return null;
  if (res.status === 403) throw new AdultTitleError("This title is 18+.");
  if (!res.ok) throw new Error(await errorMessage(res, "Could not load this title."));
  return res.json();
}

export async function removeFromLibrary(token: string, id: number): Promise<void> {
  const res = await send(token, `/library/${id}`, "DELETE");

  if (!res.ok) throw new Error("Could not remove it from your library.");
}

export type PublicCommunity = Omit<CommunitySearchResult, "joined">;

export type PublicUser = {
  userId: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  online: boolean;
  status: PresenceStatus;
  activity: number;
};

export async function getPublicUsers(): Promise<PublicUser[]> {
  const res = await api("/public/users", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load people.");
  return res.json();
}

export type LinkPreview = {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  siteName: string;
};

export async function getLinkPreview(token: string | null, url: string): Promise<LinkPreview | null> {
  const res = await api(withQuery("/links/preview", { url }), {
    headers: authHeaders(token),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load the link preview.");
  return res.json();
}

export async function getPublicCommunities(): Promise<PublicCommunity[]> {
  const res = await api("/public/communities", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load public communities.");
  return res.json();
}

export type OAuthProvider = "discord" | "twitch";

export type OAuthConnection = {
  provider: OAuthProvider;
  username: string;
  showLive: boolean;
  showClips: boolean;
  connectedAt: string;
};

export type OAuthConnections = { hasPassword: boolean; connections: OAuthConnection[] };

export type DiscordStatus = { online: number | null; inviteUrl: string | null };

export type DiscordServer = { id: string; name: string; iconUrl: string | null };

export type UnfinishedDiscord = { id: number; name: string; discordGuildName: string | null };

export type OAuthResult = {
  access_token?: string;
  linked?: OAuthProvider;
  communityId?: number;
  signup?: { token: string; username: string; avatarUrl: string | null };
  avatar?: { url: string; token: string };
  servers?: { token: string; options: DiscordServer[] };
};

export async function getOAuthProviders(): Promise<OAuthProvider[]> {
  const res = await api("/auth/oauth/providers");

  if (!res.ok) return [];
  return res.json();
}

export async function getOAuthUrl(
  provider: OAuthProvider,
  nonce: string,
  token?: string,
  communityId?: number,
  client: "web" | "mobile" = "web",
  target?: "channel",
): Promise<string> {
  const params = new URLSearchParams({ nonce });
  if (client !== "web") params.set("client", client);
  if (communityId !== undefined) params.set("communityId", String(communityId));
  if (target) params.set("target", target);
  const path = communityId !== undefined ? "community-url" : token ? "link-url" : "url";
  const res = await api(
    `/auth/oauth/${provider}/${path}?${params}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t start logging in. Please try again."));
  const { url } = await res.json();
  return url;
}

export async function completeOAuth(
  provider: OAuthProvider,
  body: { code: string; state: string; nonce: string },
  token: string | null,
): Promise<OAuthResult> {
  const res = await api(`/auth/oauth/${provider}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t finish logging in. Please try again."));
  return res.json();
}

export async function finishOAuthSignup(
  token: string,
  username: string,
  useProviderAvatar = true,
): Promise<{ access_token: string }> {
  const res = await postJson("/auth/oauth/signup", { token, username, useProviderAvatar });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t create your account. Please try again."));
  return res.json();
}

export async function acceptLinkedAvatar(token: string, offer: string): Promise<string> {
  const res = await send(token, "/auth/oauth/avatar", "POST", { token: offer });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t use that picture. Please try again."));
  return (await res.json()).avatarUrl;
}

export async function getOAuthConnections(token: string): Promise<OAuthConnections> {
  const res = await send(token, "/auth/oauth/connections");

  if (!res.ok) throw new Error("Could not load your connections.");
  return res.json();
}

export async function setShowLive(
  token: string,
  provider: OAuthProvider,
  showLive: boolean,
): Promise<void> {
  const res = await send(token, `/auth/oauth/connections/${provider}`, "PATCH", { showLive });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not update this setting."));
}

export async function setShowClips(
  token: string,
  provider: OAuthProvider,
  showClips: boolean,
): Promise<void> {
  const res = await send(token, `/auth/oauth/connections/${provider}`, "PATCH", { showClips });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not update this setting."));
}

export type Clip = {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  viewCount: number;
  duration: number;
  creatorName: string;
  createdAt: string;
};

export type ClipPage = { items: Clip[]; nextCursor: string | null };

async function clipPage(path: string, token: string | null, cursor?: string): Promise<ClipPage> {
  const res = await api(withQuery(path, { cursor: cursor || undefined }), { headers: authHeaders(token) });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t load the clips."));
  return res.json();
}

export function getCommunityClips(token: string | null, communityId: number, cursor?: string) {
  return clipPage(`/communities/${communityId}/clips`, token, cursor);
}

export function getUserClips(token: string | null, username: string, cursor?: string) {
  return clipPage(`/users/${encodeURIComponent(username)}/clips`, token, cursor);
}

export async function connectDiscordServer(
  token: string,
  servers: string,
  serverId: string,
): Promise<{ communityId: number; name: string } & DiscordStatus> {
  const res = await send(token, "/auth/oauth/community-server", "POST", { token: servers, serverId });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not connect that server."));
  return res.json();
}

export async function getUnfinishedDiscord(token: string): Promise<UnfinishedDiscord[]> {
  const res = await send(token, "/communities/discord-setup");

  if (!res.ok) throw new Error("Could not check your Discord connections.");
  return res.json();
}

export async function disconnectCommunityDiscord(token: string, communityId: number): Promise<void> {
  const res = await send(token, `/communities/${communityId}/discord`, "DELETE");

  if (!res.ok) throw new Error(await errorMessage(res, "Could not disconnect Discord."));
}

export type DiscordChannel = {
  guildId: string;
  guildName: string | null;
  channelId: string;
  isForum: boolean;
  sendPosts: boolean;
  sendLibrary: boolean;
  lostAt: string | null;
  createdAt: string;
};

export type DiscordChannelSettings = Partial<
  Pick<DiscordChannel, "sendPosts" | "sendLibrary">
>;

export async function getDiscordChannel(
  token: string,
  communityId: number,
): Promise<DiscordChannel | null> {
  const res = await send(token, `/communities/${communityId}/discord-channel`);

  if (!res.ok) throw new Error(await errorMessage(res, "Could not load the Discord channel."));
  return (await res.json()).channel;
}

export async function updateDiscordChannel(
  token: string,
  communityId: number,
  settings: DiscordChannelSettings,
): Promise<DiscordChannel | null> {
  const res = await send(token, `/communities/${communityId}/discord-channel`, "PATCH", settings);

  if (!res.ok) throw new Error(await errorMessage(res, "Could not save that."));
  return (await res.json()).channel;
}

export async function disconnectDiscordChannel(token: string, communityId: number): Promise<void> {
  const res = await send(token, `/communities/${communityId}/discord-channel`, "DELETE");

  if (!res.ok) throw new Error(await errorMessage(res, "Could not disconnect the channel."));
}

export async function disconnectCommunityTwitch(token: string, communityId: number): Promise<void> {
  const res = await send(token, `/communities/${communityId}/twitch`, "DELETE");

  if (!res.ok) throw new Error(await errorMessage(res, "Could not disconnect Twitch."));
}

export async function disconnectOAuth(token: string, provider: OAuthProvider): Promise<void> {
  const res = await send(token, `/auth/oauth/connections/${provider}`, "DELETE");

  if (!res.ok) throw new Error(await errorMessage(res, "Could not disconnect. Please try again."));
}

export type SteamStatus = {
  enabled: boolean;
  account: {
    steamId: string;
    personaName: string;
    trackGames: boolean;
    showPlaying: boolean;
    gamesPrivate: boolean;
    connectedAt: string;
    games: number;
    matched: number;
    importable: number;
  } | null;
};

export async function getSteamStatus(token: string): Promise<SteamStatus> {
  const res = await send(token, "/steam");

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t load your Steam connection."));
  return res.json();
}

export async function getSteamConnectUrl(token: string, nonce: string): Promise<string> {
  const res = await send(token, withQuery("/steam/connect-url", { nonce }));

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t start connecting Steam. Please try again."));
  const { url } = (await res.json()) as { url: string };
  return url;
}

export async function connectSteam(
  token: string,
  body: { state: string; nonce: string; params: Record<string, string> },
): Promise<SteamStatus> {
  const res = await send(token, "/steam/connect", "POST", body);

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t connect Steam. Please try again."));
  return res.json();
}

export async function updateSteamSettings(
  token: string,
  changes: { trackGames?: boolean; showPlaying?: boolean },
): Promise<SteamStatus> {
  const res = await send(token, "/steam", "PATCH", changes);

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t save that. Please try again."));
  return res.json();
}

export async function importSteamGames(
  token: string,
): Promise<{ imported: number; status: SteamStatus }> {
  const res = await send(token, "/steam/import", "POST");

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t import your Steam games. Please try again."));
  return res.json();
}

export async function disconnectSteam(token: string): Promise<void> {
  const res = await send(token, "/steam", "DELETE");

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t disconnect Steam. Please try again."));
}

export type ForumSection = { id: number; name: string; adminOnly: boolean };

export type ForumCategory = {
  id: number;
  sectionId: number | null;
  name: string;
  description: string;
  icon: string | null;
  color: string | null;
  adminOnly: boolean;
  postToFeed: boolean;
  threadCount: number;
  latest: { id: number; title: string; lastPostAt: string } | null;
};

export type ForumThreadSummary = {
  id: number;
  categoryId: number;
  title: string;
  replyCount: number;
  lastPostAt: string;
  createdAt: string;
  author: Author;
  pinned: boolean;
  locked: boolean;
  lastReply: { author: Author; createdAt: string } | null;
};

export type ForumIndex = { sections: ForumSection[]; categories: ForumCategory[] };

export type ForumCategoryRef = {
  id: number;
  name: string;
  section: Pick<ForumSection, "id" | "name"> | null;
};

export type ForumThreadPage = NumberedPage<ForumThreadSummary> & {
  category: ForumCategoryRef & { description: string; adminOnly: boolean; postToFeed: boolean };
  pinned: ForumThreadSummary[];
  canPost: boolean;
  canManage: boolean;
};

export type ForumQuote =
  | { id: number; available: false }
  | {
      id: number;
      available: true;
      content: string;
      linkUrl: string | null;
      spoiler: string | null;
      createdAt: string;
      author: Author;
      hiddenBecause?: HiddenBecause | null;
    };

export type ForumPost = {
  id: number;
  threadId: number;
  opening: boolean;
  content: string;
  linkUrl: string | null;
  spoiler: string | null;
  likeCount: number;
  liked: boolean;
  hiddenAt: string | null;
  editedAt: string | null;
  hiddenBecause?: HiddenBecause | null;
  createdAt: string;
  author: Author;
  quote: ForumQuote | null;
  canEdit: boolean;
  canDelete: boolean;
  moderation?: AuthorModeration | null;
};

export type ForumThread = {
  id: number;
  categoryId: number;
  title: string;
  replyCount: number;
  lastPostAt: string;
  createdAt: string;
  author: Author;
  category: ForumCategoryRef;
  pinned: boolean;
  locked: boolean;
  canEdit: boolean;
  canModerate: boolean;
  canReply: boolean;
};

export type ForumThreadDetail = NumberedPage<ForumPost> & { thread: ForumThread };

export type ForumSearchResult = Omit<ForumThreadSummary, "lastReply"> & {
  category: { id: number; name: string };
};

function forumPath(communityId: number, path: string) {
  return `/communities/${communityId}/forum/${path}`;
}

async function forumWrite(
  token: string,
  path: string,
  method: Method,
  fallback: string,
  body?: unknown,
) {
  const res = await send(token, path, method, body);
  if (!res.ok) throw new Error(await errorMessage(res, fallback));
  return res;
}

export async function getForum(token: string | null, communityId: number): Promise<ForumIndex> {
  const res = await api(`/communities/${communityId}/forum`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Could not load the forum.");
  return res.json();
}

export async function createForumSection(
  token: string,
  communityId: number,
  name: string,
): Promise<ForumSection> {
  const res = await forumWrite(
    token,
    forumPath(communityId, "sections"),
    "POST",
    "Could not add the section.",
    { name },
  );
  return res.json();
}

export async function updateForumSection(
  token: string,
  communityId: number,
  sectionId: number,
  changes: { name?: string; adminOnly?: boolean },
): Promise<ForumSection> {
  const res = await forumWrite(
    token,
    forumPath(communityId, `sections/${sectionId}`),
    "PATCH",
    "Could not save the section.",
    changes,
  );
  return res.json();
}

export async function reorderForumSections(
  token: string,
  communityId: number,
  ids: number[],
): Promise<void> {
  await forumWrite(
    token,
    forumPath(communityId, "sections/order"),
    "PUT",
    "Could not reorder the sections.",
    { ids },
  );
}

export async function deleteForumSection(
  token: string,
  communityId: number,
  sectionId: number,
): Promise<void> {
  await forumWrite(
    token,
    forumPath(communityId, `sections/${sectionId}`),
    "DELETE",
    "Could not delete the section.",
  );
}

export async function createForumCategory(
  token: string,
  communityId: number,
  category: {
    name: string;
    description: string;
    sectionId: number | null;
    icon?: string | null;
    color?: string | null;
  },
): Promise<ForumCategory> {
  const res = await forumWrite(
    token,
    forumPath(communityId, "categories"),
    "POST",
    "Could not add the category.",
    category,
  );
  return res.json();
}

export async function updateForumCategory(
  token: string,
  communityId: number,
  categoryId: number,
  changes: {
    name?: string;
    description?: string;
    sectionId?: number | null;
    adminOnly?: boolean;
    postToFeed?: boolean;
    icon?: string | null;
    color?: string | null;
  },
): Promise<
  Pick<
    ForumCategory,
    "id" | "sectionId" | "name" | "description" | "icon" | "color" | "adminOnly" | "postToFeed"
  >
> {
  const res = await forumWrite(
    token,
    forumPath(communityId, `categories/${categoryId}`),
    "PATCH",
    "Could not save the category.",
    changes,
  );
  return res.json();
}

export async function reorderForumCategories(
  token: string,
  communityId: number,
  ids: number[],
): Promise<void> {
  await forumWrite(
    token,
    forumPath(communityId, "categories/order"),
    "PUT",
    "Could not reorder the categories.",
    { ids },
  );
}

export async function deleteForumCategory(
  token: string,
  communityId: number,
  categoryId: number,
): Promise<void> {
  await forumWrite(
    token,
    forumPath(communityId, `categories/${categoryId}`),
    "DELETE",
    "Could not delete the category.",
  );
}

export async function getForumThreads(
  token: string | null,
  communityId: number,
  categoryId: number,
  page: number,
): Promise<ForumThreadPage> {
  const res = await api(
    withQuery(forumPath(communityId, `categories/${categoryId}/threads`), {
      page: String(page),
    }),
    { headers: authHeaders(token) },
  );
  if (res.status === 404) throw new Error("This category doesn’t exist anymore.");
  if (!res.ok) throw new Error("Could not load the threads.");
  return res.json();
}

export async function createForumThread(
  token: string,
  communityId: number,
  categoryId: number,
  thread: { title: string; content: string; linkUrl?: string; spoiler?: string | null },
): Promise<{ id: number }> {
  const res = await forumWrite(
    token,
    forumPath(communityId, `categories/${categoryId}/threads`),
    "POST",
    "Could not start the thread.",
    thread,
  );
  return res.json();
}

export async function getForumThread(
  token: string | null,
  communityId: number,
  threadId: number,
  { page, post }: { page?: number; post?: number },
): Promise<ForumThreadDetail> {
  const res = await api(
    withQuery(forumPath(communityId, `threads/${threadId}`), {
      page: page === undefined ? undefined : String(page),
      post: post === undefined ? undefined : String(post),
    }),
    { headers: authHeaders(token) },
  );
  if (res.status === 404) throw new Error("This thread doesn’t exist anymore.");
  if (!res.ok) throw new Error("Could not load the thread.");
  return res.json();
}

export async function updateForumThread(
  token: string,
  communityId: number,
  threadId: number,
  changes: { title?: string; categoryId?: number },
): Promise<{ id: number; title: string; categoryId: number }> {
  const res = await forumWrite(
    token,
    forumPath(communityId, `threads/${threadId}`),
    "PATCH",
    "Could not save the thread.",
    changes,
  );
  return res.json();
}

export async function setForumThreadFlag(
  token: string,
  communityId: number,
  threadId: number,
  flag: "pin" | "lock",
  on: boolean,
): Promise<void> {
  await forumWrite(
    token,
    forumPath(communityId, `threads/${threadId}/${flag}`),
    on ? "PUT" : "DELETE",
    `Could not ${on ? flag : `un${flag}`} the thread.`,
  );
}

export async function deleteForumThread(
  token: string,
  communityId: number,
  threadId: number,
): Promise<void> {
  await forumWrite(
    token,
    forumPath(communityId, `threads/${threadId}`),
    "DELETE",
    "Could not delete the thread.",
  );
}

export async function createForumPost(
  token: string,
  communityId: number,
  threadId: number,
  content: string,
  quoteId?: number,
  linkUrl?: string,
  spoiler?: string | null,
): Promise<{ id: number }> {
  const res = await forumWrite(
    token,
    forumPath(communityId, `threads/${threadId}/posts`),
    "POST",
    "Could not post your reply.",
    { content, quoteId, linkUrl, spoiler },
  );
  return res.json();
}

export async function updateForumPost(
  token: string,
  communityId: number,
  postId: number,
  content: string,
  linkUrl?: string,
  spoiler?: string | null,
): Promise<ForumPost> {
  const res = await forumWrite(
    token,
    forumPath(communityId, `posts/${postId}`),
    "PATCH",
    "Could not save the post.",
    { content, linkUrl, spoiler },
  );
  return res.json();
}

export async function deleteForumPost(
  token: string,
  communityId: number,
  postId: number,
): Promise<void> {
  await forumWrite(
    token,
    forumPath(communityId, `posts/${postId}`),
    "DELETE",
    "Could not delete the post.",
  );
}

export async function searchForum(
  token: string | null,
  communityId: number,
  query: string,
): Promise<ForumSearchResult[]> {
  const res = await api(withQuery(forumPath(communityId, "search"), { q: query }), {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Could not search the forum.");
  return res.json();
}

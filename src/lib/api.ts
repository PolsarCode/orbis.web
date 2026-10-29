import type { ThemeMode } from "@/stores/theme-store";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const wakeServerScript = `fetch(${JSON.stringify(`${API_URL}/health`)}).catch(function(){});`;

export type LoginCredentials = { identifier: string; password: string };

export type SignupDetails = { email: string; username: string; password: string };

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
};

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
    res
      .clone()
      .json()
      .then((body) => {
        if (body?.code === "email_unconfirmed") window.dispatchEvent(new Event(EMAIL_UNCONFIRMED_EVENT));
      })
      .catch(() => undefined);
  }
  return res;
}

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function errorMessage(res: Response, fallback: string) {
  const { message } = await res.json().catch(() => ({ message: null }));
  return typeof message === "string" ? `${message}.` : fallback;
}

async function authenticate(
  path: string,
  credentials: Credentials,
): Promise<string> {
  const res = await api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (res.status === 401) {
    throw new Error("Invalid username, email, or password.");
  }
  if (res.status === 409) {
    throw new Error(await errorMessage(res, "That account already exists."));
  }
  if (res.status === 400) {
    throw new Error(
      "Usernames are 3–20 characters: letters, numbers, or underscores.",
    );
  }
  if (!res.ok) throw new Error("Something went wrong. Please try again.");

  const { access_token } = await res.json();
  return access_token;
}

export function signup(details: SignupDetails) {
  return authenticate("/auth/signup", details);
}

export function login(credentials: LoginCredentials) {
  return authenticate("/auth/login", credentials);
}

export async function confirmEmail(token: string): Promise<void> {
  const res = await api("/auth/confirm-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t confirm your email."));
}

export async function resendConfirmation(token: string): Promise<{ confirmed: boolean }> {
  const res = await api("/auth/confirm-email/resend", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) throw new Error("You’ve asked for a few already. Try again in an hour.");
  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t send the email."));
  return res.json();
}

export async function getProfile(token: string): Promise<Profile | null> {
  const res = await api("/users", {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.ok ? res.json() : null;
}

export type Author = {
  id: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  nickname?: string | null;
};

export type CommunitySummary = Pick<Community, "id" | "name" | "iconUrl">;

export type PreviewComment = {
  id: number;
  content: string;
  linkUrl: string | null;
  createdAt: string;
  author: Author;
};

export type Post = {
  type: "post";
  id: number;
  communityId: number | null;
  content: string;
  linkUrl: string | null;
  commentCount: number;
  likeCount: number;
  liked: boolean;
  previewComments: PreviewComment[];
  hiddenAt?: string | null;
  editedAt?: string | null;
  canDelete?: boolean;
  createdAt: string;
  author: Author;
  community: CommunitySummary | null;
  wallUser: Author | null;
};

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
};

export type FeedEntry = Post | Activity;

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
  const res = await api(`/admin/users?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load users.");
  return res.json();
}

export async function getDirectoryCommunities(
  token: string,
  page: number,
): Promise<NumberedPage<DirectoryCommunity>> {
  const res = await api(`/admin/communities?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load communities.");
  return res.json();
}

export type Comment = {
  id: number;
  parentId: number | null;
  content: string;
  linkUrl: string | null;
  likeCount: number;
  liked: boolean;
  hidden?: "review" | "reported" | null;
  editedAt?: string | null;
  deleted?: boolean;
  canDelete?: boolean;
  createdAt: string;
  author: Author;
};

export type Commentable = { type: FeedEntry["type"]; id: number };

export type Likeable = { type: "post" | "activity" | "comment"; id: number };

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
  const res = await api("/users/me/preferences", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferences),
  });

  if (!res.ok) throw new Error("Could not save your preferences.");
  return res.json();
}

export async function uploadAvatar(
  token: string,
  file: File,
): Promise<Profile> {
  const body = new FormData();
  body.append("file", file);

  const res = await api("/users/me/avatar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (res.status === 413) throw new Error("Pictures must be 10 MB or smaller.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not upload your picture."));
  }
  return res.json();
}

export async function removeAvatar(token: string): Promise<Profile> {
  const res = await api("/users/me/avatar", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not remove your picture.");
  return res.json();
}

export async function getCommunities(token: string): Promise<Community[]> {
  const res = await api("/communities", {
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api("/communities/layout", {
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api("/communities/layout", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) throw new Error("Could not save your communities.");
  return res.json();
}

export async function createCommunity(
  token: string,
  name: string,
  isPublic: boolean,
): Promise<Community> {
  const res = await api("/communities", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, isPublic }),
  });

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
  const res = await api(`/communities/${communityId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(changes),
  });

  if (res.status === 403) throw new Error("Only admins can change these settings.");
  if (!res.ok) throw new Error("Could not save the settings. Please try again.");
  return res.json();
}

export type CommunityImage = "icon" | "cover" | "background";

async function sendCommunityImage(
  token: string,
  communityId: number,
  image: CommunityImage,
  init: RequestInit,
): Promise<Community> {
  const res = await api(`/communities/${communityId}/${image}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const body = new FormData();
  body.append("file", file);
  return sendCommunityImage(token, communityId, image, { method: "POST", body });
}

export function removeCommunityImage(
  token: string,
  communityId: number,
  image: CommunityImage,
): Promise<Community> {
  return sendCommunityImage(token, communityId, image, { method: "DELETE" });
}

export async function deleteCommunity(
  token: string,
  communityId: number,
): Promise<void> {
  const res = await api(`/communities/${communityId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 403) throw new Error("Only the owner can delete this community.");
  if (!res.ok) throw new Error("Could not delete the community. Please try again.");
}

export async function setCommunityAdmin(
  token: string,
  communityId: number,
  userId: number,
  isAdmin: boolean,
): Promise<Member[]> {
  const res = await api(`/communities/${communityId}/admins/${userId}`, {
    method: isAdmin ? "PUT" : "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 403) throw new Error("Only the owner can change admins.");
  if (!res.ok) throw new Error("Could not update admins. Please try again.");
  return res.json();
}

export async function searchCommunities(
  token: string,
  query: string,
): Promise<CommunitySearchResult[]> {
  const res = await api(
    `/communities/search?${new URLSearchParams({ q: query })}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) throw new Error("Could not search communities.");
  return res.json();
}

export async function joinCommunity(
  token: string,
  communityId: number,
): Promise<Community> {
  const res = await api(`/communities/${communityId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api(`/communities/${communityId}/invites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  if (!res.ok) throw new Error("Could not create an invite link. Please try again.");
  return res.json();
}

export async function createPermanentInvite(
  token: string,
  communityId: number,
): Promise<Invite> {
  const res = await api(`/communities/${communityId}/invites/permanent`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Couldn’t create the permanent QR. Please try again.");
  return res.json();
}

export async function downloadInviteCard(
  token: string,
  communityId: number,
): Promise<Blob> {
  const res = await api(`/communities/${communityId}/invites/permanent/card`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t create the card. Please try again."));
  return res.blob();
}

export async function setInviteEnabled(
  token: string,
  communityId: number,
  code: string,
  enabled: boolean,
): Promise<Invite> {
  const res = await api(`/communities/${communityId}/invites/${encodeURIComponent(code)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });

  if (!res.ok) throw new Error("Couldn’t update this QR. Please try again.");
  return res.json();
}

export async function getInvites(token: string, communityId: number): Promise<Invite[]> {
  const res = await api(`/communities/${communityId}/invites`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load invites.");
  return res.json();
}

export async function revokeInvite(
  token: string,
  communityId: number,
  code: string,
): Promise<void> {
  const res = await api(
    `/communities/${communityId}/invites/${encodeURIComponent(code)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );

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
  const res = await api(`/invites/${encodeURIComponent(code)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

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
): Promise<Post> {
  const res = await api(`/users/${encodeURIComponent(username)}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, linkUrl }),
  });

  if (res.status === 400) throw new Error("Write something before posting.");
  if (res.status === 403) throw new Error("Only friends can post on this wall.");
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
): Promise<Post> {
  const res = await api(`/library/media/${type}/${encodeURIComponent(sourceId)}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, linkUrl }),
  });

  if (res.status === 400) throw new Error("Write something before posting.");
  if (!res.ok) throw new Error("Could not post. Please try again.");
  return res.json();
}

export async function createPost(
  token: string,
  communityId: number,
  content: string,
  linkUrl?: string,
): Promise<Post> {
  const res = await api(`/communities/${communityId}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, linkUrl }),
  });

  if (res.status === 400) throw new Error("Write something before posting.");
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
  const res = await api(`/communities/${communityId}/library-updates`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ show }),
  });

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
  const res = await api(`/friends/search?${new URLSearchParams({ q: query })}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not search people.");
  return res.json();
}

export async function getFriends(token: string): Promise<FriendList> {
  const res = await api("/friends", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load your friends.");
  return res.json();
}

export async function addFriend(
  token: string,
  target: FriendTarget,
): Promise<void> {
  const res = await api("/friends", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(target),
  });

  if (res.status === 404) {
    throw new Error("No one with that username is on Orbis.");
  }
  if (res.status === 400 || res.status === 409) {
    throw new Error(await errorMessage(res, "That isn't a valid username."));
  }
  if (!res.ok) throw new Error("Could not send the request. Please try again.");
}

export async function removeFriend(token: string, userId: number): Promise<void> {
  const res = await api(`/friends/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

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
};

export type ChatMember = ChatPerson & { readAt: string | null };

export type ChatHistory = {
  messages: ChatMessage[];
  members: ChatMember[];
  hasMore: boolean;
};

function messagesRequest(token: string, path: string, method = "POST", body?: unknown) {
  return api(`/messages${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

export async function getConversations(token: string): Promise<Conversation[]> {
  const res = await messagesRequest(token, "", "GET");

  if (!res.ok) throw new Error("Could not load your messages.");
  return res.json();
}

export async function openDirectChat(token: string, userId: number): Promise<Conversation> {
  const res = await messagesRequest(token, `/direct/${userId}`);

  if (!res.ok) throw new Error(await errorMessage(res, "Could not open this chat."));
  return res.json();
}

export async function createGroupChat(
  token: string,
  userIds: number[],
  name?: string,
): Promise<Conversation> {
  const res = await messagesRequest(token, "/groups", "POST", { userIds, name });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not create the group."));
  return res.json();
}

export async function getChatHistory(
  token: string,
  id: number,
  before?: number,
): Promise<ChatHistory> {
  const query = before === undefined ? "" : `?before=${before}`;
  const res = await messagesRequest(token, `/${id}${query}`, "GET");

  if (!res.ok) throw new Error("Could not load this chat.");
  return res.json();
}

export async function sendMessage(
  token: string,
  id: number,
  text: string,
  replyToId?: number,
): Promise<ChatMessage> {
  const res = await messagesRequest(token, `/${id}`, "POST", { text, replyToId });

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
  const res = await messagesRequest(token, `/${id}/messages/${messageId}`, "PATCH", { text });

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
  const res = await messagesRequest(token, `/${id}/messages/${messageId}/reaction`, "POST", {
    emoji,
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not react to this message."));
  }
  return res.json();
}

export async function markMessagesRead(token: string, id: number): Promise<void> {
  await messagesRequest(token, `/${id}/read`);
}

export async function acceptMessageRequest(token: string, id: number): Promise<void> {
  const res = await messagesRequest(token, `/${id}/accept`);

  if (!res.ok && res.status !== 404) {
    throw new Error("Could not accept the request. Please try again.");
  }
}

export async function declineMessageRequest(token: string, id: number): Promise<void> {
  const res = await messagesRequest(token, `/${id}`, "DELETE");

  if (!res.ok && res.status !== 404) {
    throw new Error("Could not delete the request. Please try again.");
  }
}

export async function renameGroupChat(token: string, id: number, name: string): Promise<void> {
  const res = await messagesRequest(token, `/${id}`, "PATCH", { name });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not rename the group."));
}

export async function addGroupMembers(
  token: string,
  id: number,
  userIds: number[],
): Promise<void> {
  const res = await messagesRequest(token, `/${id}/members`, "POST", { userIds });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not add those people."));
}

export async function removeGroupMember(
  token: string,
  id: number,
  userId: number,
): Promise<void> {
  const res = await messagesRequest(token, `/${id}/members/${userId}`, "DELETE");

  if (!res.ok) throw new Error(await errorMessage(res, "Could not update the group."));
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
): Promise<Post> {
  const res = await api(`/posts/${postId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, linkUrl }),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not save the post."));
  return res.json();
}

export async function deletePost(token: string, postId: number): Promise<void> {
  const res = await api(`/posts/${postId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not delete the post."));
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
): Promise<Comment> {
  const res = await api("/comments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, id, parentId, content, linkUrl }),
  });

  if (res.status === 400) throw new Error("Write something before commenting.");
  if (!res.ok) throw new Error("Could not post the comment. Please try again.");
  return res.json();
}

export async function updateComment(
  token: string,
  commentId: number,
  content: string,
  linkUrl?: string,
): Promise<Comment> {
  const res = await api(`/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, linkUrl }),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not save the comment."));
  return res.json();
}

export async function deleteComment(token: string, commentId: number): Promise<void> {
  const res = await api(`/comments/${commentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not delete the comment."));
}

export async function setLike(
  token: string,
  { type, id }: Likeable,
  liked: boolean,
): Promise<LikeResult> {
  const res = await api("/likes", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, id, liked }),
  });

  if (!res.ok) throw new Error("Could not save your like.");
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

export type ContentReportTarget = "post" | "comment" | "user" | "community";
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
  const res = await api("/content-reports", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(report),
  });

  if (res.status === 409 || res.status === 400 || res.status === 404) {
    throw new Error(await errorMessage(res, "Could not send the report."));
  }
  if (!res.ok) throw new Error("Could not send the report. Please try again.");
}

export async function getReportedItems(token: string): Promise<ReportedItem[]> {
  const res = await api("/content-reports", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load reported content.");
  return res.json();
}

export async function resolveReportedItem(
  token: string,
  item: { type: ContentReportTarget; id: number },
  resolution: "resolved" | "dismissed",
): Promise<void> {
  const res = await api("/content-reports/resolution", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...item, resolution }),
  });

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
  const res = await api("/reports/admins", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load admins.");
  return res.json();
}

export async function assignReport(
  token: string,
  reportId: number,
  assigneeId: number | null,
): Promise<Report> {
  const res = await api(`/reports/${reportId}/assignee`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assigneeId }),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not assign the report."));
  return res.json();
}

export async function getReportComments(token: string, reportId: number): Promise<ReportComment[]> {
  const res = await api(`/reports/${reportId}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load comments.");
  return res.json();
}

export async function addReportComment(
  token: string,
  reportId: number,
  content: string,
): Promise<ReportComment> {
  const res = await api(`/reports/${reportId}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) throw new Error("Could not post the comment. Please try again.");
  return res.json();
}

export async function submitReport(
  token: string,
  report: { category: ReportCategory; message: string; pageUrl: string },
): Promise<{ id: number }> {
  const res = await api("/reports", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(report),
  });

  if (!res.ok) throw new Error("Could not send your report. Please try again.");
  return res.json();
}

export async function getMyReports(token: string): Promise<Report[]> {
  const res = await api("/reports/mine", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load your reports.");
  return res.json();
}

export async function getReports(token: string, hidden = false): Promise<Report[]> {
  const res = await api(hidden ? "/reports?hidden=true" : "/reports", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 403) throw new Error("Only site admins can see reports.");
  if (!res.ok) throw new Error("Could not load reports.");
  return res.json();
}

export async function searchReports(token: string, query: string): Promise<Report[]> {
  const res = await api(`/reports/search?${new URLSearchParams({ q: query })}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not search tickets.");
  return res.json();
}

export async function updateReportStatus(
  token: string,
  reportId: number,
  status: ReportStatus,
  note?: string,
): Promise<Report> {
  const res = await api(`/reports/${reportId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status, note }),
  });

  if (!res.ok) throw new Error("Could not move the report. Please try again.");
  return res.json();
}

export async function getReport(token: string, reportId: number): Promise<Report | null> {
  const res = await api(`/reports/${reportId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load the report.");
  return res.json();
}

export type ReportWebhook = { url: string | null };

export async function getReportWebhook(token: string): Promise<ReportWebhook> {
  const res = await api("/reports/webhook", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load the Discord webhook.");
  return res.json();
}

export async function setReportWebhook(
  token: string,
  webhook: { url: string } | null,
): Promise<ReportWebhook> {
  const res = await api("/reports/webhook", {
    method: webhook ? "PUT" : "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(webhook && { "Content-Type": "application/json" }),
    },
    ...(webhook && { body: JSON.stringify(webhook) }),
  });

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
  const res = await api(`/reports/${reportId}/hidden`, {
    method: hidden ? "PUT" : "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

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
  | "mention";

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

  const res = await api(`/notifications${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load notifications.");
  return res.json();
}

export async function getUnreadCount(token: string): Promise<number> {
  const res = await api("/notifications/unread", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load notifications.");
  const { unreadCount } = await res.json();
  return unreadCount;
}

export async function markNotificationRead(token: string, id: number): Promise<void> {
  await api(`/notifications/${id}/read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await api("/notifications/read", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
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
  used: { steam: boolean; connections: boolean; folders: boolean };
};

export async function getOnboarding(token: string): Promise<Onboarding> {
  const res = await api("/users/me/onboarding", {
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api("/users/me/onboarding", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(changes),
  });

  if (!res.ok) throw new Error("Could not save your checklist.");
  return res.json();
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

export async function setSiteAdmin(
  token: string,
  username: string,
  isAdmin: boolean,
): Promise<boolean> {
  const res = await api(`/users/${encodeURIComponent(username)}/admin`, {
    method: isAdmin ? "PUT" : "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api(`/users/${encodeURIComponent(username)}/verified`, {
    method: isVerified ? "PUT" : "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api(`/communities/${communityId}/verified`, {
    method: isVerified ? "PUT" : "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 403) throw new Error("Only the head admin can verify communities.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not update verification. Please try again."));
  }
  return (await res.json()).isVerified;
}

export async function uploadUserCover(token: string, file: File): Promise<Profile> {
  const body = new FormData();
  body.append("file", file);

  const res = await api("/users/me/cover", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (res.status === 413) throw new Error("Covers must be 10 MB or smaller.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not upload your cover."));
  }
  return res.json();
}

export async function removeUserCover(token: string): Promise<Profile> {
  const res = await api("/users/me/cover", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not remove your cover.");
  return res.json();
}

export async function uploadUserBackground(token: string, file: File): Promise<Profile> {
  const body = new FormData();
  body.append("file", file);

  const res = await api("/users/me/background", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (res.status === 413) throw new Error("Wallpapers must be 10 MB or smaller.");
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not upload your wallpaper."));
  }
  return res.json();
}

export async function removeUserBackground(token: string): Promise<Profile> {
  const res = await api("/users/me/background", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api(withQuery("/library/search", { q }), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Search isn’t available right now."));
  return res.json();
}

export async function getLibrary(token: string): Promise<LibraryEntry[]> {
  const res = await api("/library", {
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api("/library", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(item),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not add it to your library."));
  return res.json();
}

export async function updateLibraryEntry(
  token: string,
  id: number,
  changes: { status?: LibraryStatus; isPublic?: boolean; progress?: number },
): Promise<LibraryEntry> {
  const res = await api(`/library/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(changes),
  });

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
  const res = await api(`/library/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api("/auth/oauth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, username, useProviderAvatar }),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t create your account. Please try again."));
  return res.json();
}

export async function acceptLinkedAvatar(token: string, offer: string): Promise<string> {
  const res = await api("/auth/oauth/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: offer }),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t use that picture. Please try again."));
  return (await res.json()).avatarUrl;
}

export async function getOAuthConnections(token: string): Promise<OAuthConnections> {
  const res = await api("/auth/oauth/connections", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not load your connections.");
  return res.json();
}

export async function setShowLive(
  token: string,
  provider: OAuthProvider,
  showLive: boolean,
): Promise<void> {
  const res = await api(`/auth/oauth/connections/${provider}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ showLive }),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not update this setting."));
}

export async function setShowClips(
  token: string,
  provider: OAuthProvider,
  showClips: boolean,
): Promise<void> {
  const res = await api(`/auth/oauth/connections/${provider}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ showClips }),
  });

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
  const query = cursor ? `?${new URLSearchParams({ cursor })}` : "";
  const res = await api(`${path}${query}`, { headers: authHeaders(token) });

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
  const res = await api("/auth/oauth/community-server", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: servers, serverId }),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not connect that server."));
  return res.json();
}

export async function getUnfinishedDiscord(token: string): Promise<UnfinishedDiscord[]> {
  const res = await api("/communities/discord-setup", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Could not check your Discord connections.");
  return res.json();
}

export async function disconnectCommunityDiscord(token: string, communityId: number): Promise<void> {
  const res = await api(`/communities/${communityId}/discord`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api(`/communities/${communityId}/discord-channel`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not load the Discord channel."));
  return (await res.json()).channel;
}

export async function updateDiscordChannel(
  token: string,
  communityId: number,
  settings: DiscordChannelSettings,
): Promise<DiscordChannel | null> {
  const res = await api(`/communities/${communityId}/discord-channel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not save that."));
  return (await res.json()).channel;
}

export async function disconnectDiscordChannel(token: string, communityId: number): Promise<void> {
  const res = await api(`/communities/${communityId}/discord-channel`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not disconnect the channel."));
}

export async function disconnectCommunityTwitch(token: string, communityId: number): Promise<void> {
  const res = await api(`/communities/${communityId}/twitch`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Could not disconnect Twitch."));
}

export async function disconnectOAuth(token: string, provider: OAuthProvider): Promise<void> {
  const res = await api(`/auth/oauth/connections/${provider}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const res = await api("/steam", { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t load your Steam connection."));
  return res.json();
}

export async function getSteamConnectUrl(token: string, nonce: string): Promise<string> {
  const res = await api(withQuery("/steam/connect-url", { nonce }), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t start connecting Steam. Please try again."));
  const { url } = (await res.json()) as { url: string };
  return url;
}

export async function connectSteam(
  token: string,
  body: { state: string; nonce: string; params: Record<string, string> },
): Promise<SteamStatus> {
  const res = await api("/steam/connect", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t connect Steam. Please try again."));
  return res.json();
}

export async function updateSteamSettings(
  token: string,
  changes: { trackGames?: boolean; showPlaying?: boolean },
): Promise<SteamStatus> {
  const res = await api("/steam", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t save that. Please try again."));
  return res.json();
}

export async function importSteamGames(
  token: string,
): Promise<{ imported: number; status: SteamStatus }> {
  const res = await api("/steam/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t import your Steam games. Please try again."));
  return res.json();
}

export async function disconnectSteam(token: string): Promise<void> {
  const res = await api("/steam", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await errorMessage(res, "Couldn’t disconnect Steam. Please try again."));
}

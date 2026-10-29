import { getOAuthUrl, getSteamConnectUrl, type DiscordServer, type OAuthProvider } from "./api";

const NONCE_KEY = "oauth-nonce";
const SIGNUP_KEY = "oauth-signup";
const AVATAR_KEY = "oauth-avatar";
const SERVERS_KEY = "oauth-discord-servers";

export type PendingSignup = {
  provider: OAuthProvider;
  token: string;
  username: string;
  avatarUrl?: string | null;
};

export type PendingAvatar = {
  provider: OAuthProvider;
  url: string;
  token: string;
};

export type PendingServers = {
  communityId: number;
  token: string;
  options: DiscordServer[];
};

export const OAUTH_PROVIDERS: OAuthProvider[] = ["discord", "twitch"];

export const oauthLabels: Record<OAuthProvider, string> = {
  discord: "Discord",
  twitch: "Twitch",
};

export const oauthColors: Record<OAuthProvider, string> = {
  discord: "bg-[#5865F2]",
  twitch: "bg-[#9146FF]",
};

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as string[]).includes(value);
}

export function isMobileOAuthState(state: string | null): boolean {
  if (!state) return false;
  try {
    const payload = state.split(".")[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims: unknown = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    return Boolean(
      claims &&
        typeof claims === "object" &&
        "client" in claims &&
        claims.client === "mobile",
    );
  } catch {
    return false;
  }
}

export async function startOAuth(
  provider: OAuthProvider,
  token?: string,
  communityId?: number,
  target?: "channel",
  client: "web" | "mobile" = "web",
) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  sessionStorage.setItem(NONCE_KEY, nonce);
  window.location.assign(
    await getOAuthUrl(provider, nonce, token, communityId, client, target),
  );
}

export function savePendingSignup(signup: PendingSignup) {
  sessionStorage.setItem(SIGNUP_KEY, JSON.stringify(signup));
}

export function readPendingSignup() {
  return sessionStorage.getItem(SIGNUP_KEY);
}

export function clearPendingSignup() {
  sessionStorage.removeItem(SIGNUP_KEY);
}

export function parsePendingSignup(raw: string | null | undefined): PendingSignup | null {
  if (!raw) return null;
  try {
    const signup = JSON.parse(raw);
    return isOAuthProvider(signup.provider) &&
      typeof signup.token === "string" &&
      typeof signup.username === "string" &&
      (signup.avatarUrl === undefined ||
        signup.avatarUrl === null ||
        typeof signup.avatarUrl === "string")
      ? signup
      : null;
  } catch {
    return null;
  }
}

export function savePendingAvatar(avatar: PendingAvatar) {
  sessionStorage.setItem(AVATAR_KEY, JSON.stringify(avatar));
}

export function readPendingAvatar(): PendingAvatar | null {
  try {
    const avatar = JSON.parse(sessionStorage.getItem(AVATAR_KEY) ?? "null");
    return avatar &&
      isOAuthProvider(avatar.provider) &&
      typeof avatar.url === "string" &&
      typeof avatar.token === "string"
      ? avatar
      : null;
  } catch {
    return null;
  }
}

export function clearPendingAvatar() {
  sessionStorage.removeItem(AVATAR_KEY);
}

export function saveDiscordServers(servers: PendingServers) {
  sessionStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
}

export function readDiscordServers(communityId: number): PendingServers | null {
  try {
    const servers = JSON.parse(sessionStorage.getItem(SERVERS_KEY) ?? "null");
    return servers?.communityId === communityId &&
      typeof servers.token === "string" &&
      Array.isArray(servers.options)
      ? servers
      : null;
  } catch {
    return null;
  }
}

export function clearDiscordServers() {
  sessionStorage.removeItem(SERVERS_KEY);
}

export async function startSteamConnect(token: string) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  sessionStorage.setItem(NONCE_KEY, nonce);
  window.location.assign(await getSteamConnectUrl(token, nonce));
}

export function takeOAuthNonce() {
  const nonce = sessionStorage.getItem(NONCE_KEY);
  sessionStorage.removeItem(NONCE_KEY);
  return nonce;
}

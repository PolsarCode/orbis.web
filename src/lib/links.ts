import { getLinkPreview, type LinkPreview } from "./api";

export type YouTubeVideo = { id: string; start: number };

export const SITE_URL = "https://orbis.polsar.studio";

export const FACEBOOK_PAGE_URL = "https://www.facebook.com/OrbisFeed";

export const TEXT_LINK = /(?:https?:\/\/|www\.)[^\s<>"']+/i;
const TRAILING_PUNCTUATION = /[.,!?;:)\]}'"]+$/;

export function trimLink(raw: string) {
  return raw.replace(TRAILING_PUNCTUATION, "");
}

export function webUrl(raw: string) {
  try {
    const url = new URL(/^www\./i.test(raw) ? `https://${raw}` : raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function seconds(value: string | null) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return 0;
  const [, hours = "0", minutes = "0", secs = "0"] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(secs);
}

const GIF_HOSTS = /(^|\.)(giphy\.com|tenor\.com|klipy\.com)$/;

export function gifLink(link: string) {
  const url = new URL(link);
  return GIF_HOSTS.test(url.hostname) || /\.gif$/i.test(url.pathname);
}

export function youtubeVideo(link: string): YouTubeVideo | null {
  const url = new URL(link);
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : (url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/)?.[1] ?? null);
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;

  return { id, start: seconds(url.searchParams.get("t") ?? url.searchParams.get("start")) };
}

const previews = new Map<string, Promise<LinkPreview | null>>();

export function previewFor(token: string | null, link: string) {
  let preview = previews.get(link);
  if (!preview) {
    preview = getLinkPreview(token, link).catch(() => null);
    previews.set(link, preview);
  }
  return preview;
}

export function attachmentLabel(link: string) {
  if (youtubeVideo(link)) return "posted a video";
  if (gifLink(link)) return "posted a GIF";
  return "posted a link";
}

import type { LibraryStatus, MediaListItem, MediaType } from "./api";

export const libraryStatuses: LibraryStatus[] = [
  "current",
  "completed",
  "on_hold",
  "dropped",
  "planned",
];

const verbs: Record<MediaType, { doing: string; plan: string }> = {
  anime: { doing: "Watching", plan: "Plan to watch" },
  manga: { doing: "Reading", plan: "Plan to read" },
  game: { doing: "Playing", plan: "Plan to play" },
};

export function statusLabel(status: LibraryStatus, type?: MediaType) {
  if (status === "current") return type ? verbs[type].doing : "In progress";
  if (status === "planned") return type ? verbs[type].plan : "Planned";
  return { completed: "Completed", on_hold: "On hold", dropped: "Dropped" }[status];
}

export function progressText(
  { from, to }: { from: number; to: number },
  type: MediaType,
): [string, string] {
  const verb = type === "manga" ? "read" : "watched";
  const unit = type === "manga" ? "chapter" : "episode";
  const range = from === to ? `${unit} ${to}` : `${unit}s ${from}–${to}`;
  return [`${verb} ${range} of`, ""];
}

export function activityText(status: LibraryStatus, type: MediaType) {
  const verb = { anime: "watching", manga: "reading", game: "playing" }[type];
  return {
    current: [`started ${verb}`, ""],
    completed: ["completed", ""],
    on_hold: ["put", "on hold"],
    dropped: ["dropped", ""],
    planned: [`plans to ${verb.replace(/ing$/, "")}`, ""],
  }[status] as [string, string];
}

export const mediaPath = (type: MediaType, sourceId: string) =>
  `/library/${type}/${sourceId}`;

export function countLabel(item: MediaListItem) {
  const { episodes, chapters } = item.details;
  if (item.type === "anime" && typeof episodes === "number") return `${episodes} eps`;
  if (item.type === "manga" && typeof chapters === "number") return `${chapters} ch`;
  return item.year ? String(item.year) : "TBA";
}

export const searchable = (text: string) =>
  text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();

const mediaTypeValues: MediaType[] = ["anime", "manga", "game"];

export function mediaTypeParam(value: string | null): MediaType {
  return mediaTypeValues.find((type) => type === value) ?? "anime";
}

export function libraryPath(tab: "charts" | "discover", type: MediaType, week?: string | null) {
  const params = new URLSearchParams({ tab });
  if (type !== "anime") params.set("type", type);
  if (week) params.set("week", week);
  return `/library?${params}`;
}

export type DatePrecision = "day" | "month" | "quarter" | "year";

export type StartDate = { date: Date; precision: DatePrecision | null };

const startFields: Record<MediaType, string> = {
  anime: "airedFrom",
  manga: "publishedFrom",
  game: "releaseDate",
};
const precisions: DatePrecision[] = ["day", "month", "quarter", "year"];
const seasonNames = ["winter", "spring", "summer", "fall"] as const;

export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const utc = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString("en-US", { ...options, timeZone: "UTC" });

export function startDate(type: MediaType, details: Record<string, unknown>): StartDate | null {
  const field = startFields[type];
  const value = details[field];
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const precision = precisions.find((item) => item === details[`${field}Precision`]) ?? null;
  return { date, precision };
}

export function dateChip({ date, precision }: StartDate): { top: string; day: string | null } {
  if (precision === "day" || precision === "month") {
    return {
      top: utc(date, { month: "short" }).toUpperCase(),
      day: precision === "day" ? String(date.getUTCDate()) : null,
    };
  }
  if (precision === "quarter") return { top: `Q${Math.floor(date.getUTCMonth() / 3) + 1}`, day: null };
  return { top: String(date.getUTCFullYear()), day: null };
}

export function shortDate(start: StartDate) {
  const { top, day } = dateChip(start);
  return day ? utc(start.date, { month: "short", day: "numeric" }) : capitalize(top.toLowerCase());
}

export function releaseLabel(item: MediaListItem) {
  const start = startDate(item.type, item.details);
  if (!start?.precision) return null;
  const year = start.date.getUTCFullYear();
  if (start.precision === "day") return utc(start.date, { month: "short", day: "numeric", year: "numeric" });
  if (start.precision === "month") return utc(start.date, { month: "short", year: "numeric" });
  if (start.precision === "quarter") return `${dateChip(start).top} ${year}`;
  return String(year);
}

export function seasonId(offset: number, now = new Date()) {
  const index = Math.floor(now.getUTCMonth() / 3) + offset;
  return `${now.getUTCFullYear() + Math.floor(index / 4)}-${seasonNames[index % 4]}`;
}

export function seasonTitle(id: string) {
  const [year, name] = id.split("-");
  return `${capitalize(name)} ${year}`;
}

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

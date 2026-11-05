import type { TagWindow } from "./api";

export function tagHref(name: string) {
  return `/tags/${encodeURIComponent(name)}`;
}

export function tagPeople(people: number, window: TagWindow) {
  return `${people.toLocaleString()} ${people === 1 ? "person" : "people"} ${
    window === "day" ? "today" : "this week"
  }`;
}

export function tagFromParam(param: string) {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}

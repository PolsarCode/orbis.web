export const siteTitle =
  process.env.NODE_ENV === "development" ? "Orbis (Development)" : "Orbis";

export const landingTitle = `${siteTitle} - Your fandom. Your people.`;

export function pageTitle(...parts: (string | null | undefined)[]) {
  return [...parts.filter(Boolean), siteTitle].join(" - ");
}

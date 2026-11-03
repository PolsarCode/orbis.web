export const SPOILER_MAX = 100;

export function spoilerLabel(spoiler: string) {
  return spoiler ? `Spoiler: ${spoiler}` : "Spoiler";
}

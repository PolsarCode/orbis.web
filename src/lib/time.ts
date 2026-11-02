const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(date: string) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;

  if (Math.abs(seconds) < 60) return "just now";
  if (Math.abs(seconds) > 7 * 86400)
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const [unit, size] = units.find(([, size]) => Math.abs(seconds) >= size)!;
  return relative.format(Math.round(seconds / size), unit);
}

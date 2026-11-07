const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function longDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function minutesAndSeconds(seconds: number) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function timeAgo(date: string) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;

  if (Math.abs(seconds) < 60) return "just now";
  if (Math.abs(seconds) > 7 * 86400) return longDate(date);

  const [unit, size] = units.find(([, size]) => Math.abs(seconds) >= size)!;
  return relative.format(Math.round(seconds / size), unit);
}

import { tips, type Tip } from "./tips";

const WEEK = /^(\d{4})-W(\d{2})$/;
const WEEK_MS = 7 * 86_400_000;

function weekStart(year: number, week: number) {
  const fourth = Date.UTC(year, 0, 4);
  const weekday = (new Date(fourth).getUTCDay() + 6) % 7;
  return fourth - weekday * 86_400_000 + (week - 1) * WEEK_MS;
}

export function weeklyTip(week: string): Tip | null {
  const match = WEEK.exec(week);
  if (!match) return null;
  const year = Number(match[1]);
  const number = Number(match[2]);
  const weeksInYear = Math.round((weekStart(year + 1, 1) - weekStart(year, 1)) / WEEK_MS);
  if (number < 1 || number > weeksInYear) return null;

  const since = Math.round((weekStart(year, number) - weekStart(2026, 1)) / WEEK_MS);
  return tips[((since % tips.length) + tips.length) % tips.length];
}

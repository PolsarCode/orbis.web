import type { MediaType } from "./api";

const types: MediaType[] = ["anime", "manga", "game"];
const firstYear = 2020;
const weeks = 53;
const half = 216;
const roundKeys = [151, 37, 199, 88];
const alphabet = "k7q2xm9fa0z4cvh1tjr8bwn5gyps3due6loi";

const mix = (value: number, key: number) => ((value + key) * (value + key) * 7 + key) % half;

export function chartFromCode(code: string): { type: MediaType; week: string } | null {
  const chars = code.toLowerCase();
  if (!/^[0-9a-z]{3}$/.test(chars)) return null;

  const scrambled = [...chars].reduce((value, char) => value * 36 + alphabet.indexOf(char), 0);
  let left = Math.floor(scrambled / half);
  let right = scrambled % half;
  for (const key of [...roundKeys].reverse()) {
    [left, right] = [(right - mix(left, key) + half) % half, left];
  }

  const index = left * half + right;
  const weekIndex = Math.floor(index / types.length);
  const year = firstYear + Math.floor(weekIndex / weeks);
  const week = (weekIndex % weeks) + 1;
  return { type: types[index % types.length], week: `${year}-W${String(week).padStart(2, "0")}` };
}

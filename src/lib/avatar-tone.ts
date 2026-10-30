export const AVATAR_TONES = 2;

export function avatarTone(seed: string | number) {
  const hash = Array.from(String(seed)).reduce(
    (total, char) => (total * 31 + char.codePointAt(0)!) >>> 0,
    7,
  );
  return hash % AVATAR_TONES;
}

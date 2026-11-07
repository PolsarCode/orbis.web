export function displayName(user: {
  name: string | null;
  username: string;
  nickname?: string | null;
  deleted?: boolean;
}) {
  if (user.deleted) return "Deleted account";
  return user.nickname ?? user.name ?? user.username;
}

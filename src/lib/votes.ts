import { setLike, type Likeable, type LikeResult } from "@/lib/api";
import { currentPath, loginUrl } from "@/lib/login";
import { useAuthStore } from "@/stores/auth-store";

function requireLogin() {
  window.location.assign(loginUrl(currentPath()));
}

export async function toggleLike(
  target: Likeable,
  current: LikeResult,
  onChange: (result: LikeResult) => void,
) {
  const { token } = useAuthStore.getState();
  if (!token) return requireLogin();

  const liked = !current.liked;
  onChange({ liked, likeCount: current.likeCount + (liked ? 1 : -1) });

  try {
    onChange(await setLike(token, target, liked));
  } catch {
    onChange(current);
  }
}

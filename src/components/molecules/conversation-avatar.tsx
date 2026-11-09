import * as Atom from "@atom";
import type { Conversation } from "@/lib/api";
import { chatTitle } from "@/lib/chat";
import { displayName } from "@/lib/display-name";
import type { Device, PresenceStatus } from "@/lib/api";

const boxes = { sm: "h-8 w-8", md: "h-9 w-9" };

export function ConversationAvatar({
  conversation,
  size = "md",
  presence,
  device,
}: {
  conversation: Conversation;
  size?: keyof typeof boxes;
  presence?: PresenceStatus;
  device?: Device | null;
}) {
  const [first, second] = conversation.members;

  if (!conversation.isGroup || !second) {
    return (
      <Atom.Avatar
        label={first ? displayName(first) : chatTitle(conversation)}
        src={first?.avatarUrl}
        seed={first?.userId ?? conversation.id}
        size={size}
        presence={presence}
        device={device}
      />
    );
  }

  return (
    <span aria-hidden className={`relative shrink-0 ${boxes[size]}`}>
      <span className="absolute top-0 right-0">
        <Atom.Avatar label={displayName(second)} src={second.avatarUrl} seed={second.userId} size="xs" />
      </span>
      <span className="absolute bottom-0 left-0 rounded-full ring-2 ring-surface">
        <Atom.Avatar label={displayName(first)} src={first.avatarUrl} seed={first.userId} size="xs" />
      </span>
    </span>
  );
}

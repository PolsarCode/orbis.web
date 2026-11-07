"use client";

import { Popover } from "antd";
import { Check, CornerUpLeft, Lock, Pencil, SendHorizontal, Smile, SmilePlus, X } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type SetStateAction,
} from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import type {
  ChatMember,
  ChatMessage,
  ChatReaction,
  ChatReply,
  Conversation as Chat,
} from "@/lib/api";
import { chatTitle, MESSAGE_REACTIONS } from "@/lib/chat";
import { displayName } from "@/lib/display-name";
import { TEXT_LINK, trimLink, webUrl } from "@/lib/links";
import { useReadOnly } from "@/lib/read-only";
import { useAuthStore } from "@/stores/auth-store";
import { emitTyping } from "@/stores/friends-store";
import { markViewing, useMessagesStore } from "@/stores/messages-store";

const TYPING_IDLE_MS = 3000;
const TYPING_REPEAT_MS = 2000;
const TIME_GAP_MS = 60 * 60 * 1000;
const MESSAGE_MAX_LENGTH = 2000;
const EMOJIS = [
  "😀", "😂", "🥹", "😊", "😍", "🥰", "😘", "😎",
  "🤩", "🥳", "😅", "😭", "😢", "😮", "😡", "🤔",
  "🙄", "😴", "🤯", "🫡", "🙏", "👍", "👎", "👏",
  "🙌", "💪", "👀", "🔥", "✨", "🎉", "❤️", "💔",
  "💯", "🍜", "🍖", "🍙", "⚔️", "🌸", "⭐", "🌙",
];

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function usePageVisible() {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => true,
  );
}

function formatTime(sentAt: string) {
  return new Date(sentAt).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function linkOf(text: string) {
  const match = text.match(TEXT_LINK);
  return match ? webUrl(trimLink(match[0])) : null;
}

function readersByMessage(messages: ChatMessage[], members: ChatMember[]) {
  const readers = new Map<number, ChatMember[]>();
  for (const member of members) {
    if (!member.readAt) continue;
    const readAt = new Date(member.readAt).getTime();
    const last = messages.findLast(
      (message) => !message.system && new Date(message.sentAt).getTime() <= readAt,
    );
    if (last) readers.set(last.id, [...(readers.get(last.id) ?? []), member]);
  }
  return readers;
}

export function ChatConversation({ id, active }: { id: number; active: boolean }) {
  const me = useAuthStore((state) => state.profile?.userId);
  const loaded = useMessagesStore((state) => state.loaded);
  const failed = useMessagesStore((state) => state.failed);
  const conversation = useMessagesStore((state) =>
    state.conversations.find((current) => current.id === id),
  );

  if (!me || !loaded) {
    return (
      <div className="flex flex-1">
        <Atom.Loader />
      </div>
    );
  }
  if (failed || !conversation) {
    return (
      <p className="m-auto max-w-[240px] p-4 text-center text-[13px] text-muted">
        {failed
          ? "Messages aren’t available right now. Try again in a little while."
          : "This chat isn’t available anymore."}
      </p>
    );
  }
  return <Conversation key={id} me={me} conversation={conversation} active={active} />;
}

function Conversation({
  me,
  conversation,
  active,
}: {
  me: number;
  conversation: Chat;
  active: boolean;
}) {
  const { id, isGroup, members, unread } = conversation;
  const history = useMessagesStore((state) => state.histories[id]);
  const typers = useMessagesStore((state) => state.typing[id]);
  const loadHistory = useMessagesStore((state) => state.loadHistory);
  const loadOlder = useMessagesStore((state) => state.loadOlder);
  const markRead = useMessagesStore((state) => state.markRead);
  const react = useMessagesStore((state) => state.react);
  const readOnly = useReadOnly();
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [draft, setDraft] = useState("");
  const visible = usePageVisible();
  const list = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const restoreFrom = useRef<number | null>(null);
  const viewing = active && visible;
  const request = conversation.status === "request";
  const canMessage = history?.canMessage !== false && conversation.canMessage !== false;
  const messages = history?.messages;
  const missing = history === undefined;
  const typing = members.filter(({ userId }) => typers?.includes(userId));
  const nameOf = (userId: number, fallback: string) =>
    userId === me ? "You" : fallback;

  useEffect(() => {
    if (missing) loadHistory(id);
  }, [missing, loadHistory, id]);

  useEffect(() => {
    markViewing(id, viewing);
    return () => markViewing(id, false);
  }, [id, viewing]);

  useEffect(() => {
    if (viewing && unread > 0) markRead(id);
  }, [viewing, unread, markRead, id]);

  useEffect(() => {
    const element = list.current!;
    const observer = new ResizeObserver(() => {
      if (atBottom.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    observer.observe(content.current!);
    return () => observer.disconnect();
  }, []);

  const firstId = messages?.[0]?.id;

  useLayoutEffect(() => {
    const element = list.current;
    if (!element || restoreFrom.current === null) return;
    element.scrollTop = element.scrollHeight - restoreFrom.current;
    restoreFrom.current = null;
  }, [firstId]);

  function handleScroll() {
    const element = list.current!;
    atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    if (element.scrollTop < 48 && history?.hasMore && !history.loadingOlder) {
      restoreFrom.current = element.scrollHeight - element.scrollTop;
      loadOlder(id);
    }
  }

  function startEdit(message: ChatMessage) {
    setReplyTo(null);
    setEditing(message);
    setDraft(message.text);
  }

  function stopEdit() {
    setEditing(null);
    setDraft("");
  }

  const chatted = messages?.filter((message) => !message.system) ?? [];
  const lastOwn = chatted.findLast((message) => message.senderId === me);
  const latest = chatted.at(-1);
  const otherReadAt = history?.members[0]?.readAt;
  const seenDirect =
    !isGroup &&
    latest?.senderId === me &&
    otherReadAt != null &&
    new Date(otherReadAt) >= new Date(latest.sentAt);
  const readers = isGroup && messages && history ? readersByMessage(messages, history.members) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={list}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 [overflow-anchor:none]"
      >
        <div ref={content} className="flex flex-1 flex-col">
          {messages === undefined ? (
            <Atom.Loader />
          ) : history?.failed ? (
            <p className="m-auto text-center text-[13px] text-muted">
              Couldn’t load this chat. Try again in a little while.
            </p>
          ) : !isGroup && messages.length === 0 ? (
            <div className="m-auto flex flex-col items-center gap-2 py-6 text-center">
              {members[0] && (
                <Atom.Avatar
                  label={displayName(members[0])}
                  src={members[0].avatarUrl}
                  seed={members[0].userId}
                  size="lg"
                />
              )}
              <p className="font-semibold">{chatTitle(conversation)}</p>
              {canMessage && (
                <p className="text-[13px] text-muted">Say hi to start the conversation.</p>
              )}
            </div>
          ) : (
            <ol className="mt-auto flex flex-col gap-0.5">
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const next = messages[index + 1];
                const sentAt = new Date(message.sentAt).getTime();
                const showTime =
                  !previous || sentAt - new Date(previous.sentAt).getTime() > TIME_GAP_MS;

                if (message.system) {
                  return (
                    <li key={message.id} className="flex flex-col">
                      {showTime && <TimeLabel sentAt={message.sentAt} />}
                      <p className="my-1.5 text-center text-xs text-muted">
                        {nameOf(message.senderId, displayName(message.sender))} {message.text}
                      </p>
                    </li>
                  );
                }

                const mine = message.senderId === me;
                const sameAsPrevious =
                  previous &&
                  !previous.system &&
                  previous.senderId === message.senderId &&
                  !showTime;
                const endsGroup =
                  !next ||
                  next.system ||
                  next.senderId !== message.senderId ||
                  new Date(next.sentAt).getTime() - sentAt > TIME_GAP_MS;
                const seenBy = readers?.get(message.id);
                const senderName = displayName(message.sender);
                const link = linkOf(message.text);
                const reactWith = (emoji: string) =>
                  react(id, message.id, emoji).catch(() => null);

                return (
                  <li key={message.id} className="flex flex-col">
                    {showTime && <TimeLabel sentAt={message.sentAt} />}
                    <Molecule.HiddenGate hiddenBecause={message.hiddenBecause} className="my-1">
                      {isGroup && !mine && !sameAsPrevious && (
                        <p className="mt-1 mb-0.5 pl-9 text-[11px] text-muted">{senderName}</p>
                      )}
                      <div
                        className={`group/message flex items-end gap-2 ${mine ? "flex-row-reverse" : ""} ${
                          endsGroup && !seenBy?.length ? "mb-1.5" : ""
                        }`}
                      >
                        {!mine && (
                          <span className={`w-7 shrink-0 ${endsGroup ? "" : "invisible"}`}>
                            <Atom.Avatar
                              label={senderName}
                              src={message.sender.avatarUrl}
                              seed={message.senderId}
                              size="xs"
                            />
                          </span>
                        )}
                        <div
                          className={`flex max-w-[78%] min-w-0 flex-col ${mine ? "items-end" : "items-start"}`}
                        >
                          {message.replyTo && (
                            <ReplyQuote reply={message.replyTo} me={me} mine={mine} />
                          )}
                          <p
                            title={formatTime(message.sentAt)}
                            className={`relative max-w-full rounded-2xl px-3 py-1.5 text-sm whitespace-pre-wrap [overflow-wrap:anywhere] ${
                              mine ? "bg-accent text-accent-foreground" : "bg-rail-item text-foreground"
                            } ${editing?.id === message.id ? "ring-2 ring-foreground/25" : ""}`}
                          >
                            {message.text}
                            {message.editedAt && (
                              <span
                                title={`Edited ${formatTime(message.editedAt)}`}
                                className="ml-1.5 text-[11px] opacity-70"
                              >
                                (edited)
                              </span>
                            )}
                          </p>
                          {link && (
                            <div className="mt-1 w-64 max-w-full">
                              <Molecule.LinkPreview url={link} />
                            </div>
                          )}
                          {message.reactions.length > 0 && (
                            <Reactions
                              reactions={message.reactions}
                              me={me}
                              disabled={request || readOnly || !canMessage}
                              onReact={reactWith}
                            />
                          )}
                        </div>
                        {!request && !readOnly && canMessage && (
                          <MessageActions
                            mine={mine}
                            onReact={reactWith}
                            onReply={() => {
                              if (editing) stopEdit();
                              setReplyTo(message);
                            }}
                            onEdit={mine ? () => startEdit(message) : undefined}
                          />
                        )}
                      </div>
                    </Molecule.HiddenGate>
                    {seenBy && seenBy.length > 0 && (
                      <div
                        className="mt-0.5 mb-1.5 flex justify-end gap-0.5"
                        aria-label={`Seen by ${seenBy.map(displayName).join(", ")}`}
                      >
                        {seenBy.map((reader) => (
                          <span key={reader.userId} title={displayName(reader)}>
                            <Atom.Avatar
                              label={displayName(reader)}
                              src={reader.avatarUrl}
                              seed={reader.userId}
                              size="2xs"
                            />
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
              {seenDirect && (
                <li className="-mt-0.5 mb-1 text-right text-[11px] text-muted">Seen</li>
              )}
              {typing.length > 0 && (
                <li
                  className="flex items-end gap-2"
                  aria-label={`${typing.map(displayName).join(", ")} ${
                    typing.length === 1 ? "is" : "are"
                  } typing`}
                >
                  <span className="flex w-7 shrink-0 -space-x-2">
                    {typing.slice(0, 2).map((typer) => (
                      <Atom.Avatar
                        key={typer.userId}
                        label={displayName(typer)}
                        src={typer.avatarUrl}
                        seed={typer.userId}
                        size="xs"
                      />
                    ))}
                  </span>
                  <span className="flex gap-1 rounded-2xl bg-rail-item px-3 py-2.5">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        style={{ animationDelay: `${delay}ms` }}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted motion-reduce:animate-none"
                      />
                    ))}
                  </span>
                </li>
              )}
            </ol>
          )}
        </div>
      </div>
      {request && <RequestBanner conversation={conversation} />}
      <Composer
        conversation={conversation}
        canMessage={canMessage}
        me={me}
        text={draft}
        setText={setDraft}
        replyTo={replyTo}
        onReply={setReplyTo}
        editing={editing}
        lastOwn={lastOwn}
        onEdit={startEdit}
        onCancelEdit={stopEdit}
      />
    </div>
  );
}

function ReplyQuote({ reply, me, mine }: { reply: ChatReply; me: number; mine: boolean }) {
  return (
    <div
      className={`-mb-2 flex max-w-full flex-col rounded-2xl bg-rail-item/60 px-3 pt-1.5 pb-3 text-xs text-muted ${
        mine ? "items-end text-right" : ""
      }`}
    >
      {reply.hiddenBecause ? (
        <span className="flex items-center gap-1 italic">
          <CornerUpLeft size={12} aria-hidden />
          Message from someone you blocked
        </span>
      ) : (
        <>
          <span className="flex items-center gap-1 font-semibold">
            <CornerUpLeft size={12} aria-hidden />
            {reply.senderId === me ? "You" : displayName(reply.sender)}
          </span>
          <span className="line-clamp-2 [overflow-wrap:anywhere]">{reply.text}</span>
        </>
      )}
    </div>
  );
}

function Reactions({
  reactions,
  me,
  disabled,
  onReact,
}: {
  reactions: ChatReaction[];
  me: number;
  disabled: boolean;
  onReact: (emoji: string) => void;
}) {
  return (
    <div className="relative -mt-1.5 flex flex-wrap gap-1 px-1">
      {reactions.map(({ emoji, userIds }) => {
        const reacted = userIds.includes(me);
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            aria-pressed={reacted}
            aria-label={`${emoji} ${userIds.length}`}
            onClick={() => onReact(emoji)}
            className={`focus-ring flex h-5 cursor-pointer items-center gap-0.5 rounded-full border px-1.5 text-xs leading-none disabled:cursor-default ${
              reacted ? "border-accent bg-accent-soft" : "border-divider bg-surface"
            }`}
          >
            <span>{emoji}</span>
            {userIds.length > 1 && (
              <span className="text-[11px] text-muted tabular-nums">{userIds.length}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MessageActions({
  mine,
  onReact,
  onReply,
  onEdit,
}: {
  mine: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit?: () => void;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <div
      className={`flex shrink-0 items-center self-center transition-opacity group-hover/message:opacity-100 focus-within:opacity-100 motion-reduce:transition-none ${
        picking ? "opacity-100" : "opacity-0"
      } ${mine ? "flex-row-reverse" : ""}`}
    >
      <Popover
        open={picking}
        onOpenChange={setPicking}
        trigger="click"
        placement="top"
        content={
          <div className="flex gap-1">
            {MESSAGE_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`React with ${emoji}`}
                onClick={() => {
                  setPicking(false);
                  onReact(emoji);
                }}
                className="focus-ring flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-lg transition-transform hover:scale-125 motion-reduce:transition-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        }
      >
        <button type="button" aria-label="React" className="icon-button">
          <SmilePlus size={16} />
        </button>
      </Popover>
      <button type="button" aria-label="Reply" onClick={onReply} className="icon-button">
        <CornerUpLeft size={16} />
      </button>
      {onEdit && (
        <button type="button" aria-label="Edit" onClick={onEdit} className="icon-button">
          <Pencil size={16} />
        </button>
      )}
    </div>
  );
}

function TimeLabel({ sentAt }: { sentAt: string }) {
  return <p className="my-2 text-center text-[11px] text-muted">{formatTime(sentAt)}</p>;
}

function RequestBanner({ conversation }: { conversation: Chat }) {
  const acceptRequest = useMessagesStore((state) => state.acceptRequest);
  const declineRequest = useMessagesStore((state) => state.declineRequest);
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: number) => Promise<void>) {
    setError(null);
    action(conversation.id).catch((cause: Error) => setError(cause.message));
  }

  return (
    <div className="flex flex-col gap-2 border-t border-divider px-3 py-3 text-[13px]">
      <p className="text-muted">
        {conversation.isGroup
          ? "You were added to this group by someone who isn’t one of your friends. Accept to join the chat, or delete it."
          : `${chatTitle(conversation)} isn’t one of your friends. Accept to move this chat into your chats, or delete the request.`}
      </p>
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <div className="flex gap-2">
        <Atom.Button size="small" onClick={() => run(acceptRequest)}>
          Accept
        </Atom.Button>
        <Atom.Button size="small" variant="secondary" onClick={() => run(declineRequest)}>
          Delete
        </Atom.Button>
      </div>
    </div>
  );
}

function Composer({
  conversation,
  canMessage,
  me,
  text,
  setText,
  replyTo,
  onReply,
  editing,
  lastOwn,
  onEdit,
  onCancelEdit,
}: {
  conversation: Chat;
  canMessage: boolean;
  me: number;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  replyTo: ChatMessage | null;
  onReply: (message: ChatMessage | null) => void;
  editing: ChatMessage | null;
  lastOwn: ChatMessage | undefined;
  onEdit: (message: ChatMessage) => void;
  onCancelEdit: () => void;
}) {
  const { id } = conversation;
  const send = useMessagesStore((state) => state.send);
  const edit = useMessagesStore((state) => state.edit);
  const readOnly = useReadOnly();
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [picking, setPicking] = useState(false);
  const lastTyping = useRef(0);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function stopTyping() {
    clearTimeout(idle.current);
    if (lastTyping.current === 0) return;
    lastTyping.current = 0;
    emitTyping(id, false);
  }

  useEffect(() => {
    const sent = lastTyping;
    const timer = idle;
    return () => {
      clearTimeout(timer.current);
      if (sent.current !== 0) emitTyping(id, false);
    };
  }, [id]);

  useEffect(() => {
    const element = input.current;
    if (!element || (!replyTo && !editing)) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, [replyTo, editing]);

  function handleChange(value: string) {
    setText(value);
    if (editing) return;
    if (!value.trim()) {
      stopTyping();
      return;
    }
    if (Date.now() - lastTyping.current > TYPING_REPEAT_MS) {
      lastTyping.current = Date.now();
      emitTyping(id, true);
    }
    clearTimeout(idle.current);
    idle.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }

  function insertEmoji(emoji: string) {
    const element = input.current;
    const start = element?.selectionStart ?? text.length;
    const end = element?.selectionEnd ?? text.length;
    const next = (text.slice(0, start) + emoji + text.slice(end)).slice(0, MESSAGE_MAX_LENGTH);
    setText(next);
    requestAnimationFrame(() => {
      const caret = Math.min(start + emoji.length, next.length);
      element?.focus();
      element?.setSelectionRange(caret, caret);
    });
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = text.trim();
    if (!message) return;

    if (editing) {
      setError(null);
      if (message === editing.text) {
        onCancelEdit();
        return;
      }
      try {
        await edit(id, editing.id, message);
        onCancelEdit();
      } catch (cause) {
        setError((cause as Error).message);
      }
      return;
    }

    setText("");
    setError(null);
    stopTyping();
    const reply = replyTo;
    onReply(null);
    try {
      await send(id, message, reply?.id);
    } catch (cause) {
      setText((current) => current || message);
      onReply(reply);
      setError((cause as Error).message);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && editing) {
      onCancelEdit();
      return;
    }
    if (event.key === "Escape" && replyTo) {
      onReply(null);
      return;
    }
    if (event.key === "ArrowUp" && !text && !editing && lastOwn) {
      event.preventDefault();
      onEdit(lastOwn);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  if (!canMessage) {
    return (
      <p className="flex items-center gap-2 border-t border-divider p-3 text-xs text-muted">
        <Lock size={14} aria-hidden className="shrink-0" />
        You can’t message this person.
      </p>
    );
  }

  if (readOnly) {
    return (
      <p className="flex items-center gap-2 border-t border-divider p-3 text-xs text-muted">
        <Lock size={14} aria-hidden className="shrink-0" />
        Confirm your email to send messages.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t border-divider p-2">
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      {editing && (
        <div className="flex items-start gap-2 rounded-lg bg-rail-item/60 px-3 py-2 text-xs">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Editing message</p>
            <p className="truncate text-muted">Enter to save · Esc to cancel</p>
          </div>
          <button
            type="button"
            aria-label="Cancel editing"
            onClick={onCancelEdit}
            className="icon-button -m-1"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {replyTo && (
        <div className="flex items-start gap-2 rounded-lg bg-rail-item/60 px-3 py-2 text-xs">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Replying to {replyTo.senderId === me ? "yourself" : displayName(replyTo.sender)}
            </p>
            <p className="truncate text-muted">{replyTo.text}</p>
          </div>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={() => onReply(null)}
            className="icon-button -m-1"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={input}
          value={text}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MESSAGE_MAX_LENGTH}
          aria-label={`Message ${chatTitle(conversation)}`}
          placeholder="Aa"
          className="focus-ring max-h-32 min-h-9 flex-1 resize-none rounded-2xl bg-rail-item px-3 py-2 text-sm [field-sizing:content] placeholder:text-muted"
        />
        <Popover
          open={picking}
          onOpenChange={setPicking}
          trigger="click"
          placement="topRight"
          content={
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Insert ${emoji}`}
                  onClick={() => insertEmoji(emoji)}
                  className="focus-ring flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-lg hover:bg-rail-item"
                >
                  {emoji}
                </button>
              ))}
            </div>
          }
        >
          <button
            type="button"
            aria-label="Insert emoji"
            className="focus-ring flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-rail-item hover:text-foreground"
          >
            <Smile size={18} />
          </button>
        </Popover>
        <button
          type="submit"
          aria-label={editing ? "Save edit" : "Send"}
          disabled={!text.trim()}
          className="focus-ring flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-accent transition-colors hover:bg-rail-item disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {editing ? <Check size={18} /> : <SendHorizontal size={18} />}
        </button>
      </div>
    </form>
  );
}

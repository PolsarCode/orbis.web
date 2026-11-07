"use client";

import { Popconfirm } from "antd";
import { X } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { searchPeople, type ChatPerson, type Conversation } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { useAuthStore } from "@/stores/auth-store";
import { useFriendsStore } from "@/stores/friends-store";
import { personOf, useMessagesStore } from "@/stores/messages-store";

const GROUP_MAX_MEMBERS = 20;
const GROUP_NAME_MAX_LENGTH = 60;

function PeoplePicker({
  selected,
  onChange,
  exclude,
  max,
}: {
  selected: ChatPerson[];
  onChange: (people: ChatPerson[]) => void;
  exclude: number[];
  max: number;
}) {
  const me = useAuthStore((state) => state.profile?.userId);
  const friends = useFriendsStore((state) => state.friends);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatPerson[] | null>(null);
  const search = query.trim().replace(/^@/, "");

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!search || !token) return;
    const timer = setTimeout(() => {
      searchPeople(token, search)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const hidden = new Set([...exclude, ...selected.map(({ userId }) => userId), me]);
  const options = (search ? (results ?? []) : friends.map(personOf))
    .filter(({ userId }) => !hidden.has(userId))
    .slice(0, 8);
  const full = selected.length >= max;

  return (
    <div className="flex flex-col gap-3">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected people">
          {selected.map((person) => (
            <li
              key={person.userId}
              className="flex items-center gap-1.5 rounded-full bg-rail-item py-0.5 pr-1 pl-0.5 text-xs"
            >
              <Atom.Avatar
                label={displayName(person)}
                src={person.avatarUrl}
                seed={person.userId}
                size="xs"
              />
              {displayName(person)}
              <button
                type="button"
                aria-label={`Remove ${displayName(person)}`}
                onClick={() =>
                  onChange(selected.filter(({ userId }) => userId !== person.userId))
                }
                className="icon-button p-0.5"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Atom.Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search people by name or @username"
        aria-label="Search people"
        disabled={full}
      />
      {full ? (
        <p className="text-xs text-muted">Groups can have up to {GROUP_MAX_MEMBERS} people.</p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold text-muted uppercase">
            {search ? "Results" : "Friends"}
          </p>
          {options.length === 0 ? (
            <p className="py-2 text-[13px] text-muted">
              {search ? "No one matches that search." : "Search to find people to add."}
            </p>
          ) : (
            <ul className="flex flex-col">
              {options.map((person) => (
                <li key={person.userId}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange([...selected, personOf(person)]);
                      setQuery("");
                    }}
                    className="focus-ring flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-rail-item"
                  >
                    <Atom.Avatar
                      label={displayName(person)}
                      src={person.avatarUrl}
                      seed={person.userId}
                      size="sm"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-semibold">
                        {displayName(person)}
                      </span>
                      <span className="truncate text-xs text-muted">@{person.username}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function NewGroupModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const createGroup = useMessagesStore((state) => state.createGroup);
  const [name, setName] = useState("");
  const [people, setPeople] = useState<ChatPerson[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setName("");
    setPeople([]);
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const id = await createGroup(
        people.map(({ userId }) => userId),
        name.trim() || undefined,
      );
      handleClose();
      onCreated(id);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.Dialog open={open} onCancel={handleClose} width={480}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Molecule.ModalHeader
          eyebrow="New group"
          title="Start a group chat."
          description="Pick at least two people. Anyone who isn’t your friend gets it as a message request."
        />
        <Molecule.FormField
          label="Group name (optional)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={GROUP_NAME_MAX_LENGTH}
          autoComplete="off"
        />
        <PeoplePicker
          selected={people}
          onChange={setPeople}
          exclude={[]}
          max={GROUP_MAX_MEMBERS - 1}
        />
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex justify-end gap-2 border-t border-divider pt-6">
          <Atom.Button variant="secondary" onClick={handleClose}>
            Cancel
          </Atom.Button>
          <Atom.Button type="submit" loading={pending} disabled={people.length < 2}>
            Create group
          </Atom.Button>
        </div>
      </form>
    </Molecule.Dialog>
  );
}

export function AddPeopleModal({
  conversation,
  open,
  onClose,
  onDone,
}: {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
  onDone: (id: number) => void;
}) {
  const createGroup = useMessagesStore((state) => state.createGroup);
  const addMembers = useMessagesStore((state) => state.addMembers);
  const [people, setPeople] = useState<ChatPerson[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isGroup, members } = conversation;
  const others = members.map(({ userId }) => userId);

  function handleClose() {
    setPeople([]);
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const picked = people.map(({ userId }) => userId);
    try {
      if (isGroup) {
        await addMembers(conversation.id, picked);
        handleClose();
        onDone(conversation.id);
      } else {
        const id = await createGroup([...others, ...picked]);
        handleClose();
        onDone(id);
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.Dialog open={open} onCancel={handleClose} width={480}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Molecule.ModalHeader
          eyebrow={isGroup ? "Add people" : "New group"}
          title={isGroup ? "Add people to this group." : "Turn this chat into a group."}
          description={
            isGroup
              ? "Anyone who isn’t your friend gets it as a message request."
              : `Pick who to add. You and ${members.map(displayName).join(", ")} will be in a new group, and this chat stays as it is.`
          }
        />
        <PeoplePicker
          selected={people}
          onChange={setPeople}
          exclude={others}
          max={GROUP_MAX_MEMBERS - members.length - 1}
        />
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex justify-end gap-2 border-t border-divider pt-6">
          <Atom.Button variant="secondary" onClick={handleClose}>
            Cancel
          </Atom.Button>
          <Atom.Button type="submit" loading={pending} disabled={people.length === 0}>
            {isGroup ? "Add" : "Create group"}
          </Atom.Button>
        </div>
      </form>
    </Molecule.Dialog>
  );
}

export function GroupSettingsModal({
  conversation,
  open,
  onClose,
}: {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
}) {
  const me = useAuthStore((state) => state.profile);
  const rename = useMessagesStore((state) => state.rename);
  const addMembers = useMessagesStore((state) => state.addMembers);
  const removeMember = useMessagesStore((state) => state.removeMember);
  const [name, setName] = useState(conversation.name ?? "");
  const [adding, setAdding] = useState<ChatPerson[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { id, members, creatorId } = conversation;
  const accepted = conversation.status === "accepted";
  const isCreator = me?.userId === creatorId;

  async function run(key: string, action: () => Promise<void>) {
    setPending(key);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <Molecule.Dialog open={open} onCancel={onClose} width={480}>
      <div className="flex flex-col gap-6">
        <Molecule.ModalHeader eyebrow="Group settings" title={conversation.name ?? "Group chat"} />
        {accepted && (
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              run("rename", () => rename(id, name));
            }}
          >
            <div className="flex-1">
              <Molecule.FormField
                label="Group name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={GROUP_NAME_MAX_LENGTH}
                autoComplete="off"
              />
            </div>
            <Atom.Button
              type="submit"
              variant="secondary"
              loading={pending === "rename"}
              disabled={name.trim() === (conversation.name ?? "")}
            >
              Save
            </Atom.Button>
          </form>
        )}
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold text-muted uppercase">
            Members / {members.length + 1}
          </h3>
          <ul className="flex flex-col">
            {me && (
              <MemberRow
                person={{
                  userId: me.userId,
                  username: me.username,
                  name: null,
                  avatarUrl: me.avatarUrl,
                }}
                label="You"
                creator={isCreator}
              />
            )}
            {members.map((member) => (
              <MemberRow
                key={member.userId}
                person={member}
                creator={member.userId === creatorId}
                action={
                  isCreator && (
                    <Popconfirm
                      title={`Remove ${displayName(member)} from the group?`}
                      okText="Remove"
                      okButtonProps={{ danger: true }}
                      onConfirm={() =>
                        run(`remove-${member.userId}`, () => removeMember(id, member.userId))
                      }
                    >
                      <Atom.Button size="small" variant="text" loading={pending === `remove-${member.userId}`}>
                        Remove
                      </Atom.Button>
                    </Popconfirm>
                  )
                }
              />
            ))}
          </ul>
        </section>
        {accepted && members.length + 1 < GROUP_MAX_MEMBERS && (
          <section className="flex flex-col gap-3">
            <h3 className="text-[11px] font-bold text-muted uppercase">Add people</h3>
            <PeoplePicker
              selected={adding}
              onChange={setAdding}
              exclude={members.map(({ userId }) => userId)}
              max={GROUP_MAX_MEMBERS - members.length - 1}
            />
            {adding.length > 0 && (
              <div className="flex justify-end">
                <Atom.Button
                  loading={pending === "add"}
                  onClick={() =>
                    run("add", async () => {
                      await addMembers(id, adding.map(({ userId }) => userId));
                      setAdding([]);
                    })
                  }
                >
                  Add {adding.length === 1 ? displayName(adding[0]) : `${adding.length} people`}
                </Atom.Button>
              </div>
            )}
          </section>
        )}
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex justify-between gap-2 border-t border-divider pt-6">
          <Popconfirm
            title="Leave this group?"
            description="You’ll stop getting its messages."
            okText="Leave"
            okButtonProps={{ danger: true }}
            onConfirm={() =>
              me &&
              run("leave", async () => {
                await removeMember(id, me.userId);
                onClose();
              })
            }
          >
            <Atom.Button danger variant="secondary" loading={pending === "leave"}>
              Leave group
            </Atom.Button>
          </Popconfirm>
          <Atom.Button variant="secondary" onClick={onClose}>
            Done
          </Atom.Button>
        </div>
      </div>
    </Molecule.Dialog>
  );
}

function MemberRow({
  person,
  label,
  creator,
  action,
}: {
  person: ChatPerson;
  label?: string;
  creator: boolean;
  action?: ReactNode;
}) {
  const name = label ?? displayName(person);

  return (
    <li className="flex items-center gap-3 py-1.5">
      <Atom.Avatar label={displayName(person)} src={person.avatarUrl} seed={person.userId} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-semibold">{name}</span>
        <span className="truncate text-xs text-muted">
          @{person.username}
          {creator && " · Made the group"}
        </span>
      </span>
      {action}
    </li>
  );
}

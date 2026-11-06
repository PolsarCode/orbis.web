"use client";

import { App, Select } from "antd";
import { useEffect, useState, type FormEvent } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  addKeywordFilter,
  getBlockedPeople,
  getKeywordFilters,
  getMutedPeople,
  removeKeywordFilter,
  setUserBlocked,
  setUserMuted,
  type Author,
  type KeywordFilter,
  type KeywordFilterDuration,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { useFriendsStore } from "@/stores/friends-store";
import { useMessagesStore } from "@/stores/messages-store";

type ListedPerson = { person: Author; since: string };

const peopleLists = {
  blocked: {
    title: "Blocked people",
    description:
      "You and the people you block can’t see each other’s posts, comments or profile, and they can’t message you or send you a friend request. They aren’t told.",
    empty: "You haven’t blocked anyone. To block someone, open the … menu on their profile.",
    verb: "Blocked",
    action: "Unblock",
    load: (token: string) =>
      getBlockedPeople(token).then((people) =>
        people.map(({ blockedAt, ...person }) => ({ person, since: blockedAt })),
      ),
    undo: async (token: string, username: string) => {
      await setUserBlocked(token, username, false);
      useFriendsStore.getState().fetchFriends();
      useMessagesStore.getState().refresh();
    },
  },
  muted: {
    title: "Muted people",
    description:
      "Posts, comments, and library updates from people you mute are left out of your feeds and collapsed elsewhere, and you won’t get notifications from them. They aren’t told.",
    empty: "You haven’t muted anyone. To mute someone, open the … menu on their profile.",
    verb: "Muted",
    action: "Unmute",
    load: (token: string) =>
      getMutedPeople(token).then((people) =>
        people.map(({ mutedAt, ...person }) => ({ person, since: mutedAt })),
      ),
    undo: (token: string, username: string) => setUserMuted(token, username, false),
  },
};

const durations: { value: KeywordFilterDuration; label: string }[] = [
  { value: "forever", label: "Forever" },
  { value: "day", label: "1 day" },
  { value: "week", label: "1 week" },
  { value: "month", label: "1 month" },
];

const PHRASE_MAX_LENGTH = 50;

function useList<T>(load: (token: string) => Promise<T[]>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    let ignore = false;
    load(token)
      .then((result) => {
        if (!ignore) setItems(result);
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [load]);

  return { items, setItems, failed };
}

function expiresIn(expiresAt: string) {
  const hours = Math.max(1, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
  if (hours < 24) return `Expires in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `Expires in ${days} ${days === 1 ? "day" : "days"}`;
}

export function PeopleSafetySettings({ kind }: { kind: keyof typeof peopleLists }) {
  const { message } = App.useApp();
  const list = peopleLists[kind];
  const { items: people, setItems: setPeople, failed } = useList<ListedPerson>(list.load);
  const [pending, setPending] = useState<number | null>(null);

  async function undo(person: Author) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setPending(person.id);
    try {
      await list.undo(token, person.username);
      setPeople((current) => current?.filter((item) => item.person.id !== person.id) ?? null);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Molecule.SettingsSection
      title={list.title}
      aside={people ? String(people.length) : undefined}
      description={list.description}
    >
      {failed ? (
        <Atom.ErrorMessage>Could not load this list. Try again in a little while.</Atom.ErrorMessage>
      ) : !people ? (
        <Atom.Loader />
      ) : people.length === 0 ? (
        <p className="text-sm text-muted">{list.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider rounded-lg border border-divider">
          {people.map(({ person, since }) => (
            <li key={person.id} className="flex items-center gap-3 p-3">
              <Molecule.AuthorAvatar author={person} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Molecule.UserLink
                  username={person.username}
                  className="truncate text-sm font-semibold"
                >
                  {displayName(person)}
                </Molecule.UserLink>
                <span className="truncate text-xs text-muted">
                  @{person.username} · {list.verb}{" "}
                  <time dateTime={since} title={new Date(since).toLocaleString()}>
                    {timeAgo(since)}
                  </time>
                </span>
              </div>
              <Atom.Button
                size="small"
                variant="secondary"
                loading={pending === person.id}
                onClick={() => undo(person)}
              >
                {list.action}
              </Atom.Button>
            </li>
          ))}
        </ul>
      )}
    </Molecule.SettingsSection>
  );
}

export function KeywordFilterSettings() {
  const { message } = App.useApp();
  const { items: filters, setItems: setFilters, failed } = useList<KeywordFilter>(getKeywordFilters);
  const [phrase, setPhrase] = useState("");
  const [duration, setDuration] = useState<KeywordFilterDuration>("forever");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const trimmed = phrase.trim();

  async function add(event: FormEvent) {
    event.preventDefault();
    const { token } = useAuthStore.getState();
    if (!token || !trimmed) return;
    setAdding(true);
    setError(null);
    try {
      const filter = await addKeywordFilter(token, trimmed, duration);
      setFilters((current) => [filter, ...(current ?? [])]);
      setPhrase("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(filter: KeywordFilter) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setRemoving(filter.id);
    try {
      await removeKeywordFilter(token, filter.id);
      setFilters((current) => current?.filter(({ id }) => id !== filter.id) ?? null);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Molecule.SettingsSection
      title="Keyword filters"
      aside={filters ? String(filters.length) : undefined}
      description="Posts, comments, and forum posts that mention a filtered word or phrase are collapsed, with a button to show them anyway. Only whole words match, and your own posts are never filtered."
    >
      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
        <Atom.Input
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          maxLength={PHRASE_MAX_LENGTH}
          placeholder="Add a word or phrase"
          aria-label="Word or phrase to filter"
          className="min-w-0 flex-1"
        />
        <div className="flex gap-2">
          <Select<KeywordFilterDuration>
            value={duration}
            onChange={setDuration}
            options={durations}
            aria-label="How long to filter it"
            className="min-w-28 flex-1 sm:flex-none"
          />
          <Atom.Button type="submit" loading={adding} disabled={!trimmed}>
            Add
          </Atom.Button>
        </div>
      </form>
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      {failed ? (
        <Atom.ErrorMessage>Could not load your keyword filters. Try again in a little while.</Atom.ErrorMessage>
      ) : !filters ? (
        <Atom.Loader />
      ) : filters.length === 0 ? (
        <p className="text-sm text-muted">You aren’t filtering any words yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider rounded-lg border border-divider">
          {filters.map((filter) => (
            <li key={filter.id} className="flex items-center gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">{filter.phrase}</span>
                <span className="text-xs text-muted">
                  {filter.expiresAt ? expiresIn(filter.expiresAt) : "Forever"}
                </span>
              </div>
              <Atom.Button
                size="small"
                variant="secondary"
                loading={removing === filter.id}
                onClick={() => remove(filter)}
              >
                Remove
              </Atom.Button>
            </li>
          ))}
        </ul>
      )}
    </Molecule.SettingsSection>
  );
}

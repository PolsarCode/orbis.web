"use client";

import { App, Tooltip } from "antd";
import { Inbox, Send, UserPlus } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Template from "@template";
import type { FriendSuggestion, FriendUser } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { useReadOnly } from "@/lib/read-only";
import { useFriendsStore } from "@/stores/friends-store";
import { useLayoutStore } from "@/stores/layout-store";
import { PersonRow } from "./person-row";
import { PanelHeading, SidePanel } from "./side-panel";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[11px] font-bold text-muted uppercase">{title}</h3>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

const PANEL_SUGGESTIONS = 3;
const SUGGESTIONS_STALE_MS = 10 * 60 * 1000;

function useSuggestions() {
  const suggestions = useFriendsStore((state) => state.suggestions);
  const friends = useFriendsStore((state) => state.friends);
  const incoming = useFriendsStore((state) => state.incoming);
  const outgoing = useFriendsStore((state) => state.outgoing);

  useEffect(() => {
    const { suggestionsFetchedAt, fetchSuggestions } = useFriendsStore.getState();
    if (Date.now() - suggestionsFetchedAt > SUGGESTIONS_STALE_MS) fetchSuggestions();
  }, []);

  const known = new Set([...friends, ...incoming, ...outgoing].map(({ userId }) => userId));
  return suggestions.filter(({ userId }) => !known.has(userId));
}

function useAddSuggestion(person: FriendSuggestion) {
  const { message } = App.useApp();
  const addFriend = useFriendsStore((state) => state.addFriend);
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    try {
      await addFriend({ userId: person.userId }, { fromSuggestion: true });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
      setPending(false);
    }
  }

  return { add, pending };
}

function SuggestionRow({ person }: { person: FriendSuggestion }) {
  const { add, pending } = useAddSuggestion(person);
  const readOnly = useReadOnly();
  const label = displayName(person);

  return (
    <li className="flex items-center gap-3 py-2">
      <Link
        href={`/users/${person.username}`}
        aria-label={`${label}’s profile`}
        tabIndex={-1}
        className="shrink-0 rounded-full"
      >
        <Atom.Avatar size="sm" label={label} src={person.avatarUrl} seed={person.userId} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Molecule.UserLink
          username={person.username}
          verified={person.isVerified}
          className="truncate text-[13px] font-semibold"
        >
          {label}
        </Molecule.UserLink>
        <span className="truncate text-xs text-muted">{person.reason}</span>
      </div>
      <Tooltip
        title={readOnly ? "Confirm your email first to add friends." : "Add friend"}
        classNames={{ root: "touch-visible" }}
      >
        <span className="inline-flex">
          <button
            type="button"
            aria-label={`Add ${label} as a friend`}
            disabled={readOnly || pending}
            onClick={add}
            className="icon-button cursor-pointer disabled:pointer-events-none disabled:opacity-40"
          >
            <UserPlus size={16} />
          </button>
        </span>
      </Tooltip>
    </li>
  );
}

function SuggestionsSection({ suggestions }: { suggestions: FriendSuggestion[] }) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Section title="People you may know">
        {suggestions.slice(0, PANEL_SUGGESTIONS).map((person) => (
          <SuggestionRow key={person.userId} person={person} />
        ))}
      </Section>
      <div onClick={() => useLayoutStore.getState().closeDrawer()}>
        <Atom.ButtonLink href="/requests" variant="secondary" block>
          See all
        </Atom.ButtonLink>
      </div>
    </div>
  );
}

export function FriendsPanel() {
  const friends = useFriendsStore((state) => state.friends);
  const loaded = useFriendsStore((state) => state.loaded);
  const suggestions = useSuggestions();

  const streaming = friends.filter((friend) => friend.status === "streaming");
  const online = friends.filter((friend) => friend.online && friend.status !== "streaming");
  const offline = friends.filter((friend) => !friend.online && friend.status !== "streaming");

  const sections = [
    streaming.length > 0 && (
      <Section key="streaming" title={`Streaming / ${streaming.length}`}>
        {streaming.map((friend) => (
          <PersonRow
            key={friend.userId}
            person={friend}
            presence="streaming"
            playing={friend.playing}
            twitchLogin={friend.twitchLogin}
          />
        ))}
      </Section>
    ),
    online.length > 0 && (
      <Section key="online" title={`Online / ${online.length}`}>
        {online.map((friend) => (
          <PersonRow
            key={friend.userId}
            person={friend}
            presence={friend.status}
            playing={friend.playing}
          />
        ))}
      </Section>
    ),
    offline.length > 0 && (
      <Section key="offline" title={`Offline / ${offline.length}`}>
        {offline.map((friend) => (
          <PersonRow
            key={friend.userId}
            person={friend}
            presence="offline"
            playing={friend.playing}
          />
        ))}
      </Section>
    ),
  ].filter(Boolean);

  return (
    <>
      <PanelHeading title={`Friends / ${friends.length}`} label="Friends" />
      {!loaded ? (
        <div className="flex py-8">
          <Atom.Loader />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <SuggestionsSection suggestions={suggestions} />
          {sections.length === 0 ? (
            <p className="text-[13px] text-muted">
              No friends yet. Search for people on the home page, or add them from
              a community&apos;s member list.
            </p>
          ) : (
            sections.map((section, index) => (
              <Fragment key={index}>
                {index > 0 && <hr className="border-divider" />}
                {section}
              </Fragment>
            ))
          )}
        </div>
      )}
    </>
  );
}

function RequestCard({
  person,
  details,
  actions,
}: {
  person: FriendUser;
  details?: ReactNode;
  actions: ReactNode;
}) {
  const label = displayName(person);

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={`/users/${person.username}`}
          aria-label={`${label}’s profile`}
          tabIndex={-1}
          className="shrink-0 rounded-full"
        >
          <Atom.Avatar label={label} src={person.avatarUrl} seed={person.userId} />
        </Link>
        <div className="flex min-w-0 flex-col">
          <Molecule.UserLink
            username={person.username}
            verified={person.isVerified}
            className="truncate text-[15px] font-semibold"
          >
            {label}
          </Molecule.UserLink>
          <span className="truncate text-xs text-muted">@{person.username}</span>
        </div>
      </div>
      {details}
      <div className="flex gap-2">{actions}</div>
    </li>
  );
}

function SuggestionCard({ person }: { person: FriendSuggestion }) {
  const { add, pending } = useAddSuggestion(person);

  return (
    <RequestCard
      person={person}
      details={
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
          {person.mutualFriends.length > 0 && (
            <Molecule.AvatarStack
              people={person.mutualFriends.map(({ userId, ...friend }) => ({
                id: userId,
                ...friend,
              }))}
            />
          )}
          <span className="truncate">{person.reason}</span>
        </div>
      }
      actions={
        <Molecule.ReadOnlyGate action="add friends">
          <Atom.Button
            size="small"
            variant="secondary"
            icon={<UserPlus size={14} />}
            loading={pending}
            className="flex-1"
            onClick={add}
          >
            Add friend
          </Atom.Button>
        </Molecule.ReadOnlyGate>
      }
    />
  );
}

function SuggestionsList() {
  const suggestions = useSuggestions();
  if (suggestions.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-bold">
        People you may know / {suggestions.length}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {suggestions.map((person) => (
          <SuggestionCard key={person.userId} person={person} />
        ))}
      </ul>
    </section>
  );
}

export function FriendRequests() {
  const incoming = useFriendsStore((state) => state.incoming);
  const outgoing = useFriendsStore((state) => state.outgoing);
  const loaded = useFriendsStore((state) => state.loaded);
  const addFriend = useFriendsStore((state) => state.addFriend);
  const removeFriend = useFriendsStore((state) => state.removeFriend);
  const [tab, setTab] = useState<"received" | "sent">("received");

  const tabs = [
    { value: "received", label: "Received", count: incoming.length, icon: <Inbox size={16} aria-hidden /> },
    { value: "sent", label: "Sent", count: outgoing.length, icon: <Send size={16} aria-hidden /> },
  ] as const;
  const people = tab === "received" ? incoming : outgoing;

  return (
    <>
      <nav
        aria-label="Friend requests"
        className="flex shrink-0 items-end gap-6 border-b border-divider px-4 sm:px-8"
      >
        <div className="-mb-px flex min-w-0 items-end gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
          {tabs.map(({ value, label, count, icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={`focus-ring flex shrink-0 cursor-pointer items-center gap-2 rounded-t-sm border-b-2 px-1 py-3 text-sm whitespace-nowrap transition-colors ${
                tab === value
                  ? "border-accent text-accent"
                  : "border-transparent font-semibold text-foreground hover:text-accent"
              }`}
            >
              {icon}
              {label}
              <span className="text-xs text-muted tabular-nums">{count}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="flex min-h-0 flex-1">
        <Template.PageColumn>
          <div className="flex flex-col gap-8">
            {!loaded ? (
              <Molecule.FeedSkeleton label="Loading requests…" />
            ) : people.length === 0 ? (
              <Molecule.FeedState
                eyebrow="Empty"
                icon={<UserPlus size={24} strokeWidth={1.5} />}
                title={tab === "received" ? "No friend requests." : "No sent requests."}
                description={
                  tab === "received"
                    ? "When someone sends you a friend request, it’ll show up here."
                    : "Requests you send show up here until they’re accepted."
                }
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {people.map((person) => (
                  <RequestCard
                    key={person.userId}
                    person={person}
                    actions={
                      tab === "received" ? (
                        <>
                          <Molecule.ReadOnlyGate action="answer friend requests">
                            <Atom.Button
                              size="small"
                              className="flex-1"
                              onClick={() => addFriend({ userId: person.userId }).catch(() => null)}
                            >
                              Accept
                            </Atom.Button>
                          </Molecule.ReadOnlyGate>
                          <Molecule.ReadOnlyGate action="answer friend requests">
                            <Atom.Button
                              size="small"
                              variant="secondary"
                              className="flex-1"
                              onClick={() => removeFriend(person.userId).catch(() => null)}
                            >
                              Decline
                            </Atom.Button>
                          </Molecule.ReadOnlyGate>
                        </>
                      ) : (
                        <Molecule.ReadOnlyGate action="cancel friend requests">
                          <Atom.Button
                            size="small"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => removeFriend(person.userId).catch(() => null)}
                          >
                            Cancel request
                          </Atom.Button>
                        </Molecule.ReadOnlyGate>
                      )
                    }
                  />
                ))}
              </ul>
            )}
            <SuggestionsList />
          </div>
        </Template.PageColumn>
        <SidePanel label="Friends">
          <FriendsPanel />
        </SidePanel>
      </div>
    </>
  );
}

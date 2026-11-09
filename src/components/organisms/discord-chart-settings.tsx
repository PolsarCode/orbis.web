"use client";

import { Input, Popconfirm, Tooltip } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { Send } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  disconnectDiscordChartChannel,
  getDiscordChartChannel,
  sendDiscordCharts,
  updateDiscordChartChannel,
  type Community,
  type DiscordChartChannel,
} from "@/lib/api";
import { useReadOnly } from "@/lib/read-only";
import { weekRange } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import {
  DiscordSendSwitches,
  DiscordWebhookConnection,
  useDiscordWebhook,
  webhookStatus,
  type SendOption,
} from "./discord-channel-settings";

const MESSAGE_MAX = 500;

const chartOptions: SendOption<"sendAnime" | "sendManga" | "sendGames">[] = [
  { key: "sendAnime", label: "Anime" },
  { key: "sendManga", label: "Manga" },
  { key: "sendGames", label: "Games" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const typeLabels = [
  { key: "sendAnime", label: "Anime" },
  { key: "sendManga", label: "Manga" },
  { key: "sendGames", label: "Games" },
] as const;

function currentWeek(now = new Date()) {
  const start = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - ((now.getUTCDay() + 6) % 7),
  );
  const thursday = new Date(start + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday.getTime() - Date.UTC(year, 0, 1)) / (7 * DAY_MS)) + 1;
  return {
    week,
    year,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + 7 * DAY_MS).toISOString(),
  };
}

function messageValues(channel: DiscordChartChannel): Record<string, string> {
  const { week, year, startsAt, endsAt } = currentWeek();
  return {
    type: typeLabels.find(({ key }) => channel[key])?.label ?? "Anime",
    date: new Date(startsAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
    dates: weekRange(startsAt, endsAt),
    week: String(week),
    year: String(year),
  };
}

const variables = ["type", "date", "dates", "week", "year"];

const listFormat = new Intl.ListFormat("en-US");
const MENTION = /@(everyone|here)\b/;

function fillMessage(message: string, values: Record<string, string>) {
  return message.replace(/\{(\w+)\}/g, (match, name: string) => values[name.toLowerCase()] ?? match);
}

const requests = {
  load: getDiscordChartChannel,
  update: updateDiscordChartChannel,
  disconnect: disconnectDiscordChartChannel,
};

export function DiscordChartSettings({ community }: { community: Community }) {
  const { channel, enabled, pending, saving, error, connect, disconnect, save } =
    useDiscordWebhook(community.id, "charts", requests);
  const [draft, setDraft] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const textArea = useRef<TextAreaRef>(null);
  const caret = useRef<[number, number] | null>(null);
  const readOnly = useReadOnly();

  if (!channel && enabled === false) return null;

  const lost = Boolean(channel?.lostAt);
  const values = channel ? messageValues(channel) : {};
  const message = draft ?? channel?.message ?? "";
  const changed = message.trim() !== (channel?.message ?? "");
  const turnedOn = channel ? typeLabels.filter(({ key }) => channel[key]) : [];
  const canSend = turnedOn.length > 0 && !readOnly && !lost;

  function editMessage(next: string) {
    setDraft(next);
    setNotice(null);
  }

  async function sendNow() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setNotice(null);
    setSendError(null);
    try {
      await sendDiscordCharts(token, community.id, message.trim() || null);
      setNotice("Sent to Discord.");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  function insertVariable(token: string) {
    const element = textArea.current?.resizableTextArea?.textArea;
    const [start, end] = caret.current ?? [message.length, message.length];
    const position = start + token.length;
    editMessage((message.slice(0, start) + token + message.slice(end)).slice(0, MESSAGE_MAX));
    caret.current = [position, position];
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(position, position);
    });
  }

  async function saveMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendError(null);
    if (await save("message", { message: message.trim() || null })) {
      setDraft(null);
      setNotice("Message saved.");
    }
  }

  return (
    <Molecule.SettingsSection
      title="Weekly charts on Discord"
      description="Every Monday, post the week’s anime, manga, or games chart as an image to a channel in your Discord server, with your message and a link to its discussion on Orbis."
    >
      <DiscordWebhookConnection
        title="Charts channel"
        status={webhookStatus(channel)}
        channel={channel}
        enabled={enabled}
        pending={pending}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      {channel && (
        <>
          <DiscordSendSwitches
            options={chartOptions}
            values={channel}
            saving={saving}
            disabled={lost}
            onToggle={(key, value) => save(key, { [key]: value })}
          />
          <form onSubmit={saveMessage} className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold">Message</span>
              <Input.TextArea
                ref={textArea}
                name="message"
                maxLength={MESSAGE_MAX}
                showCount
                autoSize={{ minRows: 2, maxRows: 6 }}
                placeholder="Hey @everyone! The {type} chart for week {week} is here."
                value={message}
                disabled={lost}
                onChange={(event) => editMessage(event.target.value)}
                onSelect={(event) => {
                  const { selectionStart, selectionEnd } = event.currentTarget;
                  caret.current = [selectionStart, selectionEnd];
                }}
              />
            </label>
            <div className="flex flex-col gap-2 text-xs text-muted">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>Insert:</span>
                {variables.map((name) => (
                  <Tooltip key={name} title={values[name]}>
                    <button
                      type="button"
                      disabled={lost}
                      onClick={() => insertVariable(`{${name}}`)}
                      className="focus-ring cursor-pointer rounded-full border border-divider bg-background px-2 py-0.5 font-mono text-foreground transition-colors hover:bg-rail-item disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {`{${name}}`}
                    </button>
                  </Tooltip>
                ))}
              </div>
              <p>
                Variables are filled in when the chart is posted. @everyone and @here notify
                everyone in the channel.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted uppercase">Preview</span>
              <div className="flex flex-col gap-2 rounded-md border border-divider bg-background p-3 text-[13px] [overflow-wrap:anywhere]">
                {message.trim() && (
                  <p className="whitespace-pre-wrap">{fillMessage(message.trim(), values)}</p>
                )}
                <p className="text-muted">
                  Join the discussion at {window.location.origin}/library?tab=charts…
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Molecule.ReadOnlyGate action="change the message">
                <Atom.Button
                  type="submit"
                  size="small"
                  loading={saving === "message"}
                  disabled={!changed || lost}
                >
                  Save
                </Atom.Button>
              </Molecule.ReadOnlyGate>
              <Popconfirm
                title="Send this week’s charts to Discord now?"
                description={
                  <span className="block max-w-64">
                    Posts the {listFormat.format(turnedOn.map(({ label }) => label))}{" "}
                    {turnedOn.length === 1 ? "chart" : "charts"}
                    {message.trim() ? " with the message above" : ""}
                    {MENTION.test(message) ? ", which notifies everyone" : ""}. Monday’s post still
                    goes out{changed ? " with your saved message" : ""}.
                  </span>
                }
                okText="Send"
                disabled={!canSend}
                onConfirm={sendNow}
              >
                <Atom.Button
                  size="small"
                  variant="secondary"
                  icon={<Send size={12} />}
                  disabled={!canSend}
                >
                  Send now
                </Atom.Button>
              </Popconfirm>
              {notice ? (
                <span className="text-xs text-muted">{notice}</span>
              ) : (
                turnedOn.length === 0 &&
                !lost && (
                  <span className="text-xs text-muted">Turn on a chart to send it now.</span>
                )
              )}
            </div>
          </form>
        </>
      )}
      {(error ?? sendError) && <Atom.ErrorMessage>{error ?? sendError}</Atom.ErrorMessage>}
    </Molecule.SettingsSection>
  );
}

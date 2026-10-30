import type { Onboarding } from "./api";

export type Tip = {
  id: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  used?: keyof Onboarding["used"];
};

export const tips: Tip[] = [
  {
    id: "steam",
    title: "Bring your Steam games into Orbis",
    body: "Connect Steam to add your games, playtime, and achievements to your library. Friends and community members can also see what you’re playing.",
    action: { label: "Connect Steam", href: "/settings?tab=connections" },
    used: "steam",
  },
  {
    id: "people-you-may-know",
    title: "Find people you may know",
    body: "Orbis suggests people who share friends, communities, or titles with you. They’re at the top of the Friends panel, and all of them are on the friend requests page.",
    action: { label: "See suggestions", href: "/requests" },
  },
  {
    id: "pins",
    title: "Pin a post to the top",
    body: "Open the … menu on a post on your profile and choose Pin to keep it at the top. Community owners and admins can pin a post in their community too, like its rules.",
    action: { label: "Open your profile", href: "/profile" },
  },
  {
    id: "two-factor",
    title: "Turn on two-factor sign-in",
    body: "Ask for a code from an authenticator app on your phone whenever you log in with your password, so a leaked password isn’t enough to get into your account.",
    action: { label: "Open Security", href: "/settings?tab=security" },
    used: "twoFactor",
  },
  {
    id: "search",
    title: "Search everything from anywhere",
    body: "Press ⌘K (Ctrl+K on Windows) or / to search people, communities, posts, titles, and your library without leaving the page.",
  },
  {
    id: "folders",
    title: "Group communities into folders",
    body: "In the rail on the left, drop one community onto another to put them in a folder. Drag them to change the order, too.",
    used: "folders",
  },
  {
    id: "connections",
    title: "Log in with Discord or Twitch",
    body: "Connect Discord or Twitch to log in with one click. With Twitch connected, friends can see when you’re live.",
    action: { label: "Connect an account", href: "/settings?tab=connections" },
    used: "connections",
  },
  {
    id: "status",
    title: "Let friends know if you’re around",
    body: "Click your picture in the top right to set yourself as Online, Idle, or Busy, or to appear offline.",
  },
  {
    id: "feed-view",
    title: "Make the feed yours",
    body: "Use Filter feed to show or hide posts and library updates, and switch to Compact view to see more at a glance.",
  },
  {
    id: "mentions",
    title: "Mention people with @",
    body: "Type @ and a username in a post or comment to tag someone. They get a notification if they can see where you posted it.",
  },
  {
    id: "edit-delete",
    title: "Fix a typo or take something down",
    body: "Open the ⋯ menu on your post, or use Edit under your comment, to change or delete it. If you run a community, you can delete anything posted in it.",
  },
  {
    id: "twitch-clips",
    title: "Watch Twitch clips on Orbis",
    body: "Communities and people with Twitch connected have a Clips tab with their most-watched clips. To hide yours, go to Connections in your settings.",
    action: { label: "Open Connections", href: "/settings?tab=connections" },
  },
  {
    id: "community-discord",
    title: "Show your community’s Discord server",
    body: "If you run a community, connect its Discord server in the community’s settings to show how many people are online there, with a button to join.",
  },
  {
    id: "community-discord-channel",
    title: "Send your community’s posts to Discord",
    body: "If you run a public community, connect a Discord channel in the community’s settings, under Connections. New posts and library updates show up there with a link back to Orbis.",
  },
  {
    id: "community-links",
    title: "Link your community’s other places",
    body: "If you run a community, add its X, YouTube, Kick, and other links under Connections in the community’s settings. They show as icons on the cover photo.",
  },
  {
    id: "library-dock",
    title: "Update your library from any page",
    body: "Pull up the bar at the bottom of the screen to change what you’re watching, reading, or playing without leaving the page.",
  },
];

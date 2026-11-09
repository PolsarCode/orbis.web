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
    id: "home-screen",
    title: "Put Orbis on your phone’s home screen",
    body: "Open Orbis in your phone’s browser and choose Install, or Add to Home Screen on iPhone, to open it full screen like any other app.",
  },
  {
    id: "bookmarks",
    title: "Save posts for later",
    body: "Choose Save post in a post’s … menu to keep it. Find what you’ve saved in the Bookmarks tab on the homepage.",
    action: { label: "Open bookmarks", href: "/?tab=bookmarks" },
  },
  {
    id: "spoilers",
    title: "Hide spoilers behind a warning",
    body: "Use the eye button when you write a post, comment, or forum reply to hide it until readers choose to show it. Add a short note like “Episode 12” so people know what it’s about.",
  },
  {
    id: "community-forums",
    title: "Talk it through in the forum",
    body: "Every community has a Forum tab for longer conversations. Pick a category, start a thread, and quote a reply to answer someone directly.",
  },
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
    body: "Press ⌘K (Ctrl+K on Windows) or / to search people, communities, posts, tags, titles, and your library without leaving the page.",
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
    id: "hashtags",
    title: "Group posts with hashtags",
    body: "Add a hashtag like #frieren to a post, comment, or forum reply. Open one to see everything public that uses it, and follow it to get matching posts in your feed.",
    action: { label: "See trending tags", href: "/?tab=trending" },
  },
  {
    id: "edit-delete",
    title: "Fix a typo or take something down",
    body: "Open the ⋯ menu on your post, or use Edit under your comment, to change or delete it. If you run a community, you can delete anything posted in it.",
  },
  {
    id: "edit-history",
    title: "See what changed in an edit",
    body: "Click “edited” next to the time on a post, comment, or forum reply to see its earlier versions and when each one was posted.",
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
  {
    id: "reposts",
    title: "Repost or quote what you enjoy",
    body: "Use the repost button under a public post or library update to share it on your wall or in a community, or quote it to add your own words. Click the count to see who shared it.",
  },
  {
    id: "keyword-filters",
    title: "Hide words you’d rather not see",
    body: "Add keyword filters in Privacy settings to collapse posts and comments that mention them. To mute or block someone, open the … menu on their profile.",
    action: { label: "Open Privacy", href: "/settings?tab=privacy" },
  },
  {
    id: "weekly-charts",
    title: "See this week’s top titles",
    body: "Charts in the Catalog ranks the most popular anime, manga, and games every week, with arrows for what moved up or down. Use the download button to save a chart as an image to share.",
    action: { label: "Open charts", href: "/library?tab=charts" },
  },
  {
    id: "chart-discussions",
    title: "Talk about the weekly charts",
    body: "Every weekly chart has its own discussion under the list. Share what you think of this week’s picks, or look back at earlier weeks.",
    action: { label: "Join the discussion", href: "/library?tab=charts#discussion" },
  },
  {
    id: "community-discord-charts",
    title: "Post the weekly charts to Discord",
    body: "If you run a community, connect a Discord channel for weekly charts under Connections in the community’s settings. Every Monday, the anime, manga, or games chart is posted there with your message.",
  },
];

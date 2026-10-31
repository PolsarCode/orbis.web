---
name: landing-page-updates
description: Keep the Orbis landing page showing what visitors would sign up for. Use when adding, changing, or removing a user-facing feature that a logged-out visitor might care about. Skip it for small tweaks and admin-only tools.
---

# Landing Page Updates

Logged-out visitors see the landing page, which should make them want to sign up at a glance. It's shown by `src/app/page.tsx` and built in two files:

- `src/components/organisms/landing-hero.tsx`: the hero.
- `src/components/organisms/media-shelf.tsx`: `MediaShelf`, right under the hero. It shows the library's daily trending, new, top-rated, and upcoming lists for anime, manga, and games, and the same shelf sits on the logged-in Home feed.
- `src/components/organisms/landing-showcase.tsx`: everything below it, in order:
  - `LandingCommunities`: a scrolling strip of example communities.
  - `LandingShowcase`: one `Showcase` section per major feature. Each has a short eyebrow, a punchy heading (for example "Track what you love."), one sentence, and a visual: a small mock of the real UI built from the app's own look and assets (the pixel avatars, community icons and covers in `public/images/`, and real media covers). Sections alternate sides with `flip`.
  - `LandingExtras`: one compact row of smaller extras, each an icon and a few words.
  - `SiteStats` and `LandingCallToAction`.

## Workflow

1. Decide whether the feature is something a visitor would sign up for. If not, stop here.
2. A major feature gets its own `Showcase` section, with a visual that shows the feature in use rather than an icon and a paragraph. Keep the copy to a heading and one sentence, let the visual do the explaining, and keep sections alternating sides.
3. A smaller feature gets an entry in `extras` instead.
4. Update the hero's intro paragraph only if the feature changes what Orbis is, not just what it can do.
5. Update or remove sections and extras when the features they show change or are removed.
6. Check the page at desktop and phone widths.

## Rules

- Keep the page visual and easy to scan, with no walls of text or long lists of features.
- Mark the mock visuals `aria-hidden` so the heading and sentence carry the meaning.

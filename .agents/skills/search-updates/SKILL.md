---
name: search-updates
description: Keep the Orbis site search covering everything people could look for. Use when adding or changing content people could find by name or text, adding a page with its own items, or changing what existing items are called or contain.
---

# Search Updates

Orbis has one search for the whole site: the modal in `src/components/organisms/site-search.tsx`, opened from the top bar or with Ctrl K, ⌘K, or `/`. Pages don't have their own search boxes.

## How It Works

- **Site-wide sources** are listed in `searchSources` in `src/stores/search-store.ts`. Each one has a loader, a result row, and a label in `site-search.tsx`, and data behind it:
  - Posts: `GET /feed/search` (`searchPosts`).
  - Titles: `GET /library/search` (`searchLibrary`).
  - People: `GET /friends/search` (`searchPeople`).
  - Communities: `GET /communities/search` (`searchCommunities`).
  - Your library: filtered in the browser from `getLibrary`.
  - Tickets, for site admins only: `GET /reports/search` (`searchReports`).
- **Page sections**: a page renders `<SearchScope />` to put the most relevant source first (`lead`), add its own section on top (`section`, like a community's posts and members, a profile's friends and posts, or notifications), or hear about titles added from search (`onAdded`).

## Workflow

1. Decide where the new or changed content belongs:
   - **Findable from anywhere**: add a source to `searchSources`, with its loader, result row, and label in `site-search.tsx`, and a server endpoint (see the server's `search-endpoints` skill).
   - **Only meaningful on one page**: give that page a `SearchScope` section.
   - **Changed content**: make sure the existing endpoints still match the new names or text, and still hide what the viewer shouldn't see.
2. Make each result open the item directly, and offer the obvious quick action where there is one (Add to library, Join, Connect).
3. When what search covers changes, update the `search` stops in `onboarding.tsx`.
4. Check it in the browser: search from the page it belongs to and from another page, at desktop and phone widths.

## Rules

- Don't add another search box to a page. Filters that narrow the list you're already looking at, like the reports board filter, are fine.
- Search must never show something the viewer couldn't see where it normally lives: private communities and profiles, reported or hidden content, and 18+ titles when NSFW is off.

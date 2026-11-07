<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Instructions

## Skills

Step-by-step instructions live in skills in `.agents/skills/`, linked as `.claude/skills/` for Claude Code. Any agent can also read them as plain files. Whenever one of these situations applies, follow its skill in the same change:

- **Adding, changing, or removing a user-facing feature** (skip small tweaks and admin-only tools) → `onboarding-updates` (`.agents/skills/onboarding-updates/SKILL.md`): add or update tour stops, checklist items, and tips of the week for anything people need to know about.
- **Adding or changing anything people could look for by name or text** (new content, a page with its own items, or new names or text on existing items) → `search-updates` (`.agents/skills/search-updates/SKILL.md`): keep the site search covering it, with the same privacy rules as where it's shown.

## Rules

- **Unconfirmed emails are read-only.** Until someone confirms their email, the server refuses anything they try to create or change, and a banner at the top of every page tells them (`EmailConfirmBanner`; it also lights up whenever the server refuses something for this reason). When you add a way to post, send, react, join, or edit, check `useReadOnly()` (`src/lib/read-only.ts`): wrap a single button in `Molecule.ReadOnlyGate`, which disables it with a "Confirm your email first to …" tooltip, or show a short note instead of a whole form, the way `PostComposer` and the chat composer do. Reading, settings for the person's own preferences, and marking notifications read stay available.
- **Reuse before you build.** Before writing a new component, hook, or helper, look for one that already does the same job or follows the same pattern, in `src/components/` (for example `Molecule.Dialog`, `Atom.TabLink` and `Atom.TabButton`, `Molecule.ViewToggle`, `Molecule.ReadOnlyGate`, and `FriendsSidePanel`), in `src/lib/` (`useMediaQuery`, `useNow`, and the request helpers inside `api.ts`), and in the stores (`requireToken()`), and use it. When you'd be writing the same markup or logic a second or third time, move it into a shared component (in `atoms`, `molecules`, or `organisms`, with its `index.ts` export) or a hook or helper in `src/lib/`, and switch the existing copies over, keeping the UI exactly the same. Don't add an abstraction only one place uses, or one that needs a pile of options to fit every caller.

# CLAUDE.md — MedBank

Guidance for Claude Code in this repo. The shared cross-tool rulebook is
**@AGENTS.md** (read it — it holds the hard rules and a refactor log). The
architecture map, feature inventory, and risk analysis are in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). This file is the quick index; do
not duplicate those — point to them.

## Overview

MedBank is a medical-student MCQ study app: a **static SPA served as-is from
GitHub Pages** with **hosted Supabase** (Postgres + Auth + RLS + Edge Functions)
as the single source of truth. No build step runs in the deploy path. The
browser uses only the anon key; privileged work happens in Edge Functions.

## Stack

- Vanilla JS SPA — `main.js` (~47k lines, single flat scope, **not** a module or
  IIFE): one mutable `state` object, one `render()` router on `state.route`.
- `bootstrap.js` loads supabase-js + GSAP + Lucide from CDNs, then loads `main.js`.
- `styles.css` (~15k lines): light/dark/comfort themes.
- Supabase: 52 migrations in `supabase/migrations/`, 6 Edge Functions.
- Optional tooling: esbuild + ESLint (not deployed). `framer-motion` in
  `package.json` is unused — GSAP (CDN) is the real animation runtime.

## Key commands

```bash
npm run lint          # ESLint (optional; CI runs it)
npm run build         # esbuild → dist/ (optional; NOT served)
npm run build:minify  # minified variant
```

- **No local dev server.** It's a static site — open `index.html`, or use the
  preview tooling. Supabase is hosted, no local DB.
- **Schema changes:** add a timestamped migration in `supabase/migrations/` and
  `supabase db push --dns-resolver https` to the hosted project. Never edit the
  stale `schema.sql` snapshots.
- **Deploy:** push to `main` → `validate-changes.yml` runs → `deploy-pages.yml`
  ships the repo root to GitHub Pages.

## Conventions

- **Served files are shipped as-is:** `index.html`, `main.js`, `bootstrap.js`,
  `supabase.config.js`, `styles.css`, `sw.js`. Keep `main.js` runnable as a plain
  classic `<script>` — no bundler dependency in the runtime.
- **Cache-bust on every served-file change:** bump `app-version` in `index.html`.
  Use `YYYY-MM-DD.NN-local` for preview/local testing, `YYYY-MM-DD.NN` for
  production (drop `-local` when shipping).
- **Routing:** add a route = `renderXxx()` + `wireXxx()` reached via `render()`.
- **Escaping:** wrap every user-controlled string going into `innerHTML` with
  `escapeHtml()` (~L42284). Choice labels are whitelisted to `A`–`E` via
  `normalizeQuestionChoiceLabel`.
- **Fonts:** headings = Geist (`--font-heading`); body/MCQ reading = Inter
  (`--font-body`). Both loaded from Google Fonts in `index.html` head.
- **Sync keys:** relational tables are primary; `app_state` is legacy/offline only,
  namespaced `g:<key>` (global) / `u:<uid>:<key>` (user-scoped).
- **Log a refactor entry** in `AGENTS.md` + `CHANGELOG.md` for changes other tools
  should know about.

## Architecture pointers

- Full map, data flow, feature health, security, mismatches → `docs/ARCHITECTURE.md`.
- Directory layout & data model → `@AGENTS.md` §2–3.
- Admin endpoints (canonical Edge Functions vs. deprecated `api/`) → `@AGENTS.md` §6.
- Access is **approval-based, not payment-based** — no Stripe/billing exists;
  gating is `profiles.approved` / `mcq_access_enabled` / `courses_access_enabled`.

## Immutable rules (do NOT do without explicit confirmation)

1. **Never alter Supabase RLS policies, auth, or access-gating tables** (`profiles`
   approval/access flags, `app_state` RLS) without explicit user confirmation.
2. **Never put secrets in frontend files.** `main.js`, `bootstrap.js`,
   `supabase.config.js`, `index.html` may contain only the hosted URL + anon key.
   Service-role keys / agent tokens / LLM keys live only in Edge Functions.
3. **Schema changes go in migrations only**, applied to the hosted project. The
   root/`database` `schema.sql` files are stale snapshots — do not edit to change
   live schema.
4. **Don't flip the deploy to built/minified output** — that's a separate explicit
   decision that must also update `sw.js` precache + `bootstrap.js` script src.
5. **Don't extend the deprecated `api/*.js`** — extend the Edge Function instead.
6. Prefer additive, reversible changes; this repo is shared by multiple AI tools.

## Status notes (verified against hosted DB 2026-06-30)

- **Hosted DB ↔ repo migrations: in sync** (52 migrations, no drift).
- **Course Platform (LMS):** live — 9 platform tables, 1 published course.
- **Hermes AI agent:** live/used — `admin-agent-tool` active, ~4,103 action-log
  entries.
- **Cloudflare Stream:** parked (`cloudflareStreamEnabled: false`, pending
  billing); Edge Functions deployed, app falls back to Supabase Storage video.
- `framer-motion` in `package.json` is unused — safe to remove. See
  `docs/ARCHITECTURE.md` §7 for the follow-up list.

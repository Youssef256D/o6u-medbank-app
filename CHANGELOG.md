# Changelog

All notable changes to O6U MedBank are recorded here. This is a human-readable
companion to `AGENTS.md` (which is the machine-oriented guide for AI coding
tools). Dates are YYYY-MM-DD.

The live site is a static SPA served from the committed files on GitHub Pages;
hosted Supabase is the source of truth.

## [Unreleased]

### 2026-06-27 — Custom font system

- Swapped the static SPA font loading from a CSS `@import` to document-head Google Fonts links with preconnects, `font-display=swap`, and only Bricolage Grotesque 500/700 plus Inter 400/500.
- Added centralized `--font-heading` and `--font-body` variables, kept the older font variables as aliases, and routed headings, UI labels, timers, metrics, MCQ stems, options, and explanations through those variables.
- Bumped `index.html` `app-version` to `2026-06-27.02` so installed/PWA clients fetch the updated shell and stylesheet.

### 2026-06-27 — GSAP animation runtime

- Installed the official GSAP agent skills into the workspace and added GSAP/ScrollTrigger CDN loading through `bootstrap.js` so the static GitHub Pages app can use GSAP without a build step.
- Added GSAP-powered route intro timelines, card hover motion, and scroll reveal hooks with CSS fallbacks and `prefers-reduced-motion` support.
- Bumped `index.html` `app-version` to `2026-06-27.01` so static clients fetch the updated scripts/styles.

### 2026-06-22 — Admin user create refresh fix

- Preserved recently entered admin-side user fields during the immediate Supabase profile refresh, preventing stale/partial profile rows from wiping name, role, phone, approval, or enrollment details right after adding a user.
- Added a safe debug log for this merge decision and bumped `index.html` `app-version` to `2026-06-22.03` so static clients fetch the corrected script.

### 2026-06-22 — Mobile responsiveness polish

- Added phone-only CSS refinements for the MCQ solving view so answer controls keep larger tap targets without changing the desktop exam layout.
- Added a mobile scroll fade to the admin sidebar navigation to make the horizontal tab rail clearer on very narrow screens.
- Bumped `index.html` `app-version` to `2026-06-22.02` so static clients fetch the updated stylesheet.
- Verified public auth, student dashboard, courses, lesson placeholder, MCQ session/review, profile, and admin users/dashboard at phone widths with Playwright.

### 2026-06-22 — Student content access reliability

- Made post-auth student warmup wait for the first Supabase profile/enrollment/question refresh before rendering empty dashboard/create-test/analytics states.
- Added explicit student question-read status (`idle`/`loading`/`success`/`error`) so query failures and still-loading states no longer look like zero questions.
- Added safe access-decision diagnostics with row counts/status only; question text, answers, tokens, and secrets are not logged.
- Wired Courses platform enrollment mutations to the existing student refresh signal so admin enrollment changes prompt quick student-side course reloads.
- Bumped `index.html` `app-version` to force static clients onto the updated served files.

### 2026-06-18 — Safety & tooling pass (no behavior change to the live site)

A multi-part hardening/cleanup pass. **No served file changed behaviorally and
the live deploy model is unchanged.** Everything here is reversible.

#### Security: innerHTML / XSS escaping audit
- Enumerated all 60 `.innerHTML` assignments in `main.js` and every `${...}`
  interpolation into HTML element, attribute, `href=`/`src=`/`style=`/`data-`
  contexts.
- **Result: verified clean — no patches were needed.** The existing
  `escapeHtml()` helper (used 525×) provides consistent escaping.
- The single field that appeared unescaped, `choice.id` at the session/review
  render sites, was traced through the full data flow and confirmed safe:
  `normalizeQuestionChoiceLabel` whitelists choice ids to exactly
  `A`–`E` before any render path, discarding all other values.
- No fabricated patches were added to `main.js`. The escaping discipline already
  in place is sound.

#### Build tooling (optional — not wired into the deploy)
- Added `package.json` with `devDependencies`: `esbuild`, `eslint`; scripts
  `build`, `build:minify`, `lint`.
- Added `build/esbuild.config.js`: reads committed `main.js`/`bootstrap.js`,
  emits optional output to `dist/` with non-colliding names (`*.built.js` by
  default, `*.min.js` via `build:minify`).
- Added `eslint.config.cjs` with a conservative correctness/security config.
- `dist/` is gitignored. The committed, un-minified `main.js` remains the served
  source of truth. Flipping the deploy to serve built output is a future,
  explicit decision.

#### CI
- Extended `.github/workflows/validate-changes.yml` to run `npm ci`,
  `npm run lint`, and `npm run build` alongside the existing `node --check` and
  file-existence checks. Keeps the optional build pipeline healthy without
  changing what GitHub Pages deploys.

#### Admin endpoint deprecation
- Marked the `/api` Node serverless layer (`api/admin-delete-user.js`,
  `api/admin-set-user-access.js`, `api/admin-set-user-password.js`,
  `api/_supabase.js`) as `@deprecated` with headers pointing to the canonical
  Supabase Edge Functions. Files retained for the optional Vercel/Netlify
  hosting path. In the current GitHub Pages deploy the frontend always uses the
  Edge Functions (`serverApiBaseUrl` is empty in `supabase.config.js`), so this
  changes nothing at runtime.
- Added a "Canonical admin endpoints" note to `README.md`.

#### Schema source-of-truth clarification
- Added non-authoritative banner comments to root `schema.sql` and
  `database/schema.sql` clarifying they are historical snapshots and that
  `supabase/migrations/` is canonical. No SQL content changed.

#### Documentation
- Created `AGENTS.md` — cross-tool instruction file (Codex, Antigravity, Zcode,
  Claude, Cursor, Windsurf) covering project rules, codebase layout, the build
  pipeline, schema authority, and a refactor log.
- Created this `CHANGELOG.md`.

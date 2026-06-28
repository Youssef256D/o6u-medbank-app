# Changelog

All notable changes to MedBank are recorded here. This is a human-readable
companion to `AGENTS.md` (which is the machine-oriented guide for AI coding
tools). Dates are YYYY-MM-DD.

The live site is a static SPA served from the committed files on GitHub Pages;
hosted Supabase is the source of truth.

## [Unreleased]

### 2026-06-29 — Full question usability repair and fade cleanup

- Restored/repaired hosted Supabase question data so all 3,024 stored questions are published and usable, including all 572 Gynecology questions.
- Rebuilt missing/empty answer choices from the preserved `g:mcq_questions` backup instead of inventing MCQ content.
- Fixed interrupted route animations that could leave the dashboard faded during/after student refreshes.
- Bumped the local preview `app-version` to `2026-06-29.05-local`.

### 2026-06-29 — Student refresh button reliability

- Centralized the student cloud refresh button wiring so dashboard, analytics, and create-test loading/error states all run the same targeted refresh action.
- Fixed create-test loading/error refresh buttons that could render without a click handler while content access or question hydration was still recovering.
- Added safe question-choice indexes to the admin question-count migration so choice existence/correct-answer checks and choice hydration use indexed lookups.
- Bumped the local preview `app-version` to `2026-06-29.04-local`.

### 2026-06-29 — Admin/student Supabase sync count reliability

- Added a database-backed admin question-count summary RPC and frontend fallback so dashboard/course counts no longer depend on partially hydrated question rows.
- Made admin refresh update lightweight profile/course/notification data and fresh question totals without loading the full question bank unless the Questions/Bulk Import screens need row data.
- Added admin dashboard question visibility/usability totals by status/course, including published-but-unusable counts for data-quality monitoring.
- Bumped the local preview `app-version` to `2026-06-29.03-local`.

### 2026-06-29 — Gynecology topic alias filter fix

- Canonicalized stale Gynecology topic aliases in client-side matching so `Gynecological endocrinology` maps to `Gynecologic Endocrinology` and `Female genital infection` maps to `Female Genital Infections`.
- Deduped create-test topic options by normalized topic key, preferring topic names that actually appear on published usable questions.
- Bumped the local preview `app-version` to `2026-06-29.02-local`.

### 2026-06-29 — Faster student Supabase sync

- Split student refresh into a critical first pass and a background non-critical pass so login/page-load routes stop waiting on notifications, session-history hydration, and legacy app-state reads after the course/question catalog is ready.
- Parallelized the critical student course/profile/question reads so the question catalog no longer waits for course/topic and profile hydration to finish first.
- Increased the Supabase question catalog page size from 500 to 1000 rows to reduce round trips for large course banks and admin question hydration.
- Kept manual/full refresh paths intact and bumped the local preview `app-version` to `2026-06-29.01-local`.

### 2026-06-29 — MCQ question visibility data repair

- Added and applied a hosted Supabase migration to clean up MCQ rows that admins could see but students could not receive in generated tests.
- Removed invalid duplicate published question rows when a usable same-stem copy already existed in the same course.
- Moved remaining published rows with missing answer choices or missing correct-answer flags back to draft so they no longer appear published while being silently excluded from student blocks.
- Merged duplicate Gynecology topic labels such as Basic/General Gynecology, Female Genital Infections, and Gynecologic Endocrinology.
- Verified the live database now has zero published questions across all courses with unusable choice/correct-answer data and zero case/spacing duplicate topic-name groups.

### 2026-06-28 — Student dashboard icon refresh

- Added Lucide icons via the static bootstrap CDN fallback chain for cleaner student dashboard iconography.
- Swapped the dashboard stat/action icons to Lucide targets, timers, list checks, database, and action symbols while keeping inline SVG fallbacks if the CDN fails.
- Bumped the local preview `app-version` to `2026-06-28.12-local`.

### 2026-06-28 — Public hero scale cleanup

- Reduced public marketing hero heading sizes across landing, features, pricing, about, and contact so the headers no longer dominate the viewport.
- Removed the landing login/create-account container card while keeping the buttons and helper text visible.
- Bumped the local preview `app-version` to `2026-06-28.10-local`.

### 2026-06-28 — Public-only full-frame shell

- Scoped the edge-to-edge shell and flattened top-level panel to public marketing routes only (`landing`, `features`, `pricing`, `about`, `contact`).
- Restored logged-in/private pages to the centered card-style app shell while keeping admin/session width exceptions intact.
- Restricted GSAP route item and scroll reveal targets to public marketing routes so inner app cards no longer appear while scrolling.
- Bumped the local preview `app-version` to `2026-06-28.08-local`.

### 2026-06-28 — Home and auth page simplification

- Simplified the landing route after visual review: shorter headline, less competing mockup content, centered copy, and a stronger login/create-account call-to-action card.
- Rebuilt login, signup, Google onboarding, and forgot-password routes with a two-column public auth layout, clearer form card, stronger primary submit buttons, and responsive mobile stacking.
- Added the new auth/landing elements to GSAP route reveal targets and bumped the local preview `app-version` to `2026-06-28.06-local`.

### 2026-06-28 — Public page visual polish

- Added three static SVG About illustrations for study workspace, review flow, and progress analytics so the About route is less text-heavy without adding runtime dependencies.
- Reworked the landing route into a richer marketing hero with a simulated MCQ/review preview and proof cards.
- Rebuilt Pricing and Contact as polished marketing pages with plan cards, process cards, contact method cards, a support form, and FAQ tiles.
- Extended GSAP marketing-page animation hooks to the new About visual cards plus landing, pricing, and contact cards while keeping reduced-motion behavior intact.
- Added the new About SVGs to the service-worker precache and bumped the local preview `app-version` to `2026-06-28.05-local`.

### 2026-06-28 — Public About and Features refresh

- Rebuilt the Features route with a polished marketing hero, feature highlight cards, and concise copy for focused blocks, exam rhythm, review, analytics, and admin workflows.
- Rebuilt the About route with richer MedBank positioning, an "Our start" vertical story timeline, milestone labels, and principle cards.
- Added GSAP-specific marketing page motion for hero text, feature cards, and the About timeline while preserving reduced-motion behavior and CSS fallback layout.
- Bumped the local preview `app-version` to `2026-06-28.04-local`.

### 2026-06-28 — MedBank identity refresh

- Renamed the public-facing product identity from the previous university-branded name to MedBank across page titles, metadata, navigation, landing copy, admin/report labels, docs, package metadata, and static cache labels.
- Added new MedBank social/brand logo assets and pointed Open Graph, Twitter, service-worker precache, and landing logo references at the new asset.
- Kept the current GitHub Pages URL path unchanged because the deployed repository is still served from `/o6u-medbank-app/`.
- Bumped the local preview `app-version` to `2026-06-28.03-local`.

### 2026-06-28 — Typography refresh

- Replaced the playful Bricolage Grotesque heading face with Geist for a cleaner, more premium medical-study interface.
- Loaded 400/500/600/700 weights for Geist and Inter so headings, buttons, stats, and MCQ reading surfaces render without browser-synthesized weights.
- Kept Inter as the body/MCQ reading font and bumped `index.html` `app-version` to `2026-06-28.01` so static clients fetch the updated typography.

### 2026-06-27 — Student content loading speed

- Stopped the student dashboard from staying on the "Checking Your Course Bank" loading panel while the first question-bank refresh is still running.
- Let create-test and analytics skip blocking only when usable cached/local course questions already exist, preserving their first-load safety.
- Kept the Supabase refresh running in the background and showed the dashboard question-bank stat as syncing until questions arrive.
- Bumped `index.html` `app-version` to `2026-06-27.03` so static clients fetch the updated student readiness logic.

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

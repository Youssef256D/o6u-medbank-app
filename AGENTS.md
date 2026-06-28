# AGENTS.md — MedBank

This file is the shared instruction guide for any AI coding tool working on this
repo (Codex, Antigravity, Zcode, Claude, Cursor, Windsurf, etc.). It states the
project's hard rules, the codebase layout, and a running log of refactors so the
next agent does not accidentally undo prior work or get confused by tooling.

> Read this file before editing. When you finish a change that other tools should
> know about, add an entry under **Refactor log** and/or **CHANGELOG.md**.

---

## 1. Hard rules (do not break these)

1. **The served site is a static SPA on GitHub Pages.** The committed files
   `index.html`, `main.js`, `bootstrap.js`, `supabase.config.js`, `styles.css`,
   and `sw.js` are served **as-is** with no build step in the deploy path. Do not
   introduce a runtime dependency on a bundler for the site to load — `main.js`
   must stay runnable as a plain classic `<script>`. (A build pipeline exists for
   optional minification, but the deploy does not use it — see §4.)

2. **Hosted Supabase is the single source of truth** for auth, courses,
   questions, progress, enrollments, and admin data. Browser storage is only a
   cache/UX layer (route memory, theme, offline pending writes).

3. **Never put secrets in frontend files.** `main.js`, `bootstrap.js`,
   `supabase.config.js`, and `index.html` may only contain the hosted project URL
   and the **publishable/anon** key. `SUPABASE_SERVICE_ROLE_KEY`, agent tokens,
   and any LLM provider keys belong only in `/api/*.js` (serverless) and
   `supabase/functions/*/index.ts` (Edge Functions).

4. **Schema changes go in migrations only.** Apply them to the hosted project.
   The root `schema.sql` and `database/schema.sql` files are **historical
   snapshots, not authoritative** (see §5). Do not edit them to change live
   schema.

5. **Keep `escapeHtml()` discipline.** Every user-controlled string interpolated
   into HTML must be wrapped in `escapeHtml(...)`. A full audit confirmed the
   current code is clean (see Refactor log 2026-06-18). The one field that looks
   unescaped — `choice.id` — is provably whitelisted to `A`–`E` by
   `normalizeQuestionChoiceLabel` before any render, so it is safe by
   construction. Do not regress this.

6. **Don't break the other tools.** This repo is worked on by multiple agents.
   Prefer additive, reversible changes. Document non-obvious decisions here and
   in `CHANGELOG.md`.

---

## 2. Codebase layout

```
index.html              App shell + head meta/SEO + theme bootstrap. Injects bootstrap.js.
bootstrap.js            IIFE loader. Loads supabase-js from CDN, handles OAuth
                        callback + native deep link, registers service worker,
                        then loads main.js as a classic <script>.
main.js                 THE SPA — ~47k lines, single flat module scope (NOT an
                        IIFE, NOT ES modules). Shared `state` object (line ~287),
                        central `render()` router (line ~19023) that switches on
                        `state.route` -> `renderXxx()` + `wireXxx()`. ~1,066
                        top-level function declarations.
styles.css              All styling (light/dark/comfort themes), ~15k lines.
supabase.config.js      window.__SUPABASE_CONFIG: URL, anon key, feature flags.
sw.js                   Service worker: precaches app shell, versioned cache,
                        offline fallback.

api/                    OPTIONAL Node serverless endpoints (admin actions). Uses
                        SUPABASE_SERVICE_ROLE_KEY. DEPRECATED in place — see §6.
  _supabase.js            Shared helpers (CORS, rate limit, auth, profile role).
  admin-delete-user.js
  admin-set-user-access.js
  admin-set-user-password.js

supabase/
  functions/            Deno/TS Edge Functions — CANONICAL admin path.
    admin-delete-user/            } These three are the live admin endpoints;
    admin-set-user-access/        } /api/*.js mirrors them but is unused in the
    admin-set-user-password/      } GitHub Pages deploy (see §6).
    admin-agent-tool/   Hermes AI admin assistant (scoped + full-admin tools).
    cloudflare-stream-token/      Protected long-course-video pipeline.
    cloudflare-stream-tus-upload/
  migrations/           CANONICAL schema source of truth. Timestamped. Apply to
                        hosted project only (no local DB). See §5.
  optional_migrations/  Performance indexes that can be applied selectively.
  rollbacks/            Reverse SQL for selected migrations.

database/               Historical/reference copies. README here documents the
  schema.sql              hosted-DB model. schema.sql is a STALE snapshot (§5).
  migrations/           Older migration copies; superseded by supabase/migrations.

docs/                   Operational runbooks (e.g. supabase-disk-io-runbook.md).
Assets/                 Branding images.
```

### Routes (the `state.route` values the router handles)
- **Public:** `landing`, `features`, `pricing`, `about`, `contact`
- **Auth:** `login`, `signup`, `forgot`, `reset-password`, `complete-profile`
- **Student app:** `app-launcher`, `courses`, `dashboard`, `notifications`,
  `create-test`, `session`, `review`, `analytics`, `profile`
- **Admin:** `admin` (sub-pages: dashboard, users, courses, questions,
  bulk-import, notifications, site-access, ai-agents, activity, logs,
  course-platform)

### Key invariants in `main.js`
- One shared mutable `state` object; one `appEl = #app`; one `render()`.
- `escapeHtml(value)` is the HTML-escaping helper (around line 40314). Use it
  for any dynamic string going into `innerHTML`.
- `normalizeQuestionChoiceLabel` whitelists choice ids to `A`–`E`; all choice
  rendering goes through `normalizeQuestionChoiceEntries` first.

---

## 3. Data model (hosted Supabase)

Core relational tables: `profiles`, `courses`, `course_topics`,
`user_course_enrollments`, `questions`, `question_choices`, `question_tags`,
`test_blocks`, `test_block_items`, `test_responses`, `notifications`, etc.
Plus the admin-agent control plane (`admin_agents`, `admin_agent_action_log`,
`admin_agent_approval_requests`) and the course learning-platform tables.

Enums: `user_role` (student/admin), `question_difficulty`, `question_status`
(draft/published/archived), `block_mode` (tutor/timed), `block_source`
(all/unused/incorrect/flagged), `block_status`.

RLS is enforced throughout. The browser uses only the anon key; every row-level
permission is in Postgres RLS policies, not in frontend code.

---

## 4. Build pipeline (optional, does NOT affect the live site)

A build pipeline is scaffolded but **not wired into the deploy**:

- `package.json` — devDependencies: `esbuild`, `eslint`. Scripts: `build`,
  `build:minify`, `lint`.
- `build/esbuild.config.js` — reads committed `main.js`/`bootstrap.js` and emits
  optional output to `dist/` (`*.built.js` by default, `*.min.js` via
  `build:minify`). Output filenames never collide with the served files.
- `eslint.config.cjs` — conservative lint config for syntax/correctness checks
  without imposing a large style refactor on the existing flat-script SPA.
- `dist/` is gitignored.

The committed, un-minified `main.js` remains the source of truth and what
GitHub Pages serves. Flipping the deploy to serve built output is a **separate,
explicit decision** that must also update `sw.js` precache paths and the
`bootstrap.js` script src. CI runs `npm run build` + `npm run lint` on every
push to keep the pipeline healthy, but the build artifacts are not deployed.

---

## 5. Schema source of truth

**Authoritative:** `supabase/migrations/*.sql` (applied to the hosted project).

**Non-authoritative snapshots (do not edit to change live schema):**
- `/schema.sql` (root) — historical snapshot of the early relational schema
  (21 tables). Missing everything added after Feb 2026 (`profiles`, course
  platform tables, `admin_agents`, etc.). Marked with a banner comment.
- `/database/schema.sql` — identical stale copy, also banner-marked.
- `/database/migrations/` — older migration copies; superseded by
  `supabase/migrations/`.

To change the schema: add a timestamped migration under `supabase/migrations/`
and apply it to the hosted project (`supabase db push --dns-resolver https`).
Do not start or depend on a local Postgres/Supabase instance.

---

## 6. Admin endpoints (canonical vs. deprecated)

**Canonical (used in production):** the Supabase Edge Functions
`supabase/functions/admin-delete-user`, `admin-set-user-access`,
`admin-set-user-password`. The frontend (`main.js`) calls these via
`<project-url>/functions/v1/admin-*`. When `supabase.config.js → serverApiBaseUrl`
is empty (the current GitHub Pages config), the `/api` Node path is never used —
the code always falls back to the Edge Functions.

**Deprecated (retained, not used in the current deploy):** `/api/admin-delete-user.js`,
`/api/admin-set-user-access.js`, `/api/admin-set-user-password.js`, and
`/api/_supabase.js`. These mirror the Edge Functions and exist only to support
an optional Vercel/Netlify hosting path where `serverApiBaseUrl` is set. Each
file carries a `@deprecated` header. Do not extend these; extend the Edge
Function instead. If you move the frontend off GitHub Pages to such a host, you
can reactivate them.

---

## 7. Refactor log (most recent first)

### 2026-06-29 — Faster student Supabase sync
Reduced how long student routes wait on Supabase after login/page load without
weakening the existing profile, enrollment, or question-bank checks.

1. **Student refresh is split by priority.** The automatic login/page-load
   refresh now waits for the critical relational pass (courses/topics,
   profile/enrollment, and questions), then queues notifications, helper
   app-state keys, and session-history hydration in the background.
2. **Critical reads run in parallel.** Courses/topics, profile/enrollment, and
   question catalog hydration now start together because Supabase RLS enforces
   the access checks server-side.
3. **Question catalog hydration uses larger pages.** The question page size is
   now 1000 rows, matching the catalog RPC cap and reducing round trips for
   larger banks.
4. **Manual/full refresh remains thorough.** Explicit refresh paths still await
   the non-critical hydration work so admin/user flows that expect a full sync
   keep their behavior.
5. **Static cache bust bumped.** `index.html` app-version is
   `2026-06-29.01-local` for preview testing.

**Files touched:** `main.js`, `index.html`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-29 — MCQ question visibility data repair
Fixed a hosted Supabase data issue where some admin-visible MCQ rows could not
appear in student-generated tests because they were published without usable
answer choices or correct-answer flags.

1. **Invalid duplicate rows were removed.** Published question rows with missing
   usable answer data were deleted only when a usable same-stem question already
   existed in the same course and the invalid row had no test-block references.
2. **Remaining invalid rows were drafted.** Published rows without enough
   non-empty answer choices or without any correct choice were moved back to
   `draft` instead of being filled with placeholder answers.
3. **Gynecology topics were combined.** Duplicate/synonymous Gynecology topic
   labels were merged into one active topic per concept for Basic Gynecology,
   General Gynecology, Female Genital Infections, and Gynecologic Endocrinology.
4. **All-course verification passed.** Live SQL checks confirmed zero published
   questions across all courses with unusable choice/correct-answer data and
   zero case/spacing duplicate topic-name groups after applying the migration.

**Files touched:** `supabase/migrations/20260628212914_repair_mcq_question_visibility_and_gyne_topics.sql`,
`CHANGELOG.md`, `AGENTS.md`.

### 2026-06-28 — Student dashboard icon refresh
Improved the student dashboard stat/action icons using a static-SPA-safe icon library.

1. **Lucide loads through bootstrap.** `bootstrap.js` now loads Lucide from jsDelivr with unpkg fallback before `main.js`, without introducing a bundler dependency.
2. **Dashboard icons use Lucide.** `studentSvgIcon()` maps student stats/actions to Lucide icons (`target`, `timer-reset`, `list-checks`, `database-zap`, etc.) and still returns inline SVG fallbacks if Lucide is unavailable.
3. **Static cache bust bumped.** `index.html` app-version is `2026-06-28.12-local` for preview testing.

**Files touched:** `bootstrap.js`, `main.js`, `styles.css`, `index.html`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-28 — Public hero scale cleanup
Adjusted public page hero sizing and the landing CTA area after visual review.

1. **Outer hero titles are smaller.** Marketing hero headings now use a lower desktop/mobile clamp so public headers do not dominate the viewport.
2. **Landing CTA is no longer boxed.** The login/create-account controls remain in place, but the surrounding landing auth card border, background, blur, padding, and shadow were removed.
3. **Static cache bust bumped.** `index.html` app-version is `2026-06-28.10-local` for preview testing.

**Files touched:** `styles.css`, `index.html`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-28 — Public-only full-frame shell
Changed the outer marketing layout so public pages use the full browser frame while logged-in app pages keep the centered card shell.

1. **Full-frame is route-scoped.** `body.is-public-marketing-route` now controls the edge-to-edge `.app-shell` and applies only to `landing`, `features`, `pricing`, `about`, and `contact`.
2. **Private pages keep cards.** The default `.app-shell` is back to the centered `1200px` card layout, with the existing wider admin/session exceptions preserved.
3. **Scroll reveal is public-only.** GSAP item reveal/ScrollTrigger targets now exclude auth and logged-in routes, so inner app cards do not animate into view while scrolling.
4. **Static cache bust bumped.** `index.html` app-version is `2026-06-28.08-local` for preview testing.

**Files touched:** `main.js`, `styles.css`, `index.html`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-28 — Home and auth page simplification
Simplified the public landing screen and made authentication routes more prominent after visual review.

1. **Landing is calmer.** The home hero now uses a shorter headline, centered copy, compact proof chips, and a focused login/create-account card instead of the busier simulated MCQ preview.
2. **Auth routes have dedicated layouts.** Login, signup, Google onboarding completion, and forgot-password routes now use `auth-public-*` shell/card/form classes with stronger primary actions and clearer explanatory copy.
3. **Responsive and motion coverage was updated.** New auth/landing elements stack cleanly on mobile and participate in the existing GSAP route reveal target system.
4. **Static cache bust bumped.** `index.html` app-version is `2026-06-28.06-local` for preview testing.

**Files touched:** `main.js`, `styles.css`, `index.html`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-28 — Public page visual polish
Expanded the public marketing polish beyond About/Features while preserving the static GitHub Pages SPA model.

1. **About now has visual relief.** Added three static SVG illustrations under `Assets/branding/` for the study workspace, review flow, and analytics/progress story; these are local assets with no runtime API dependency.
2. **Landing, Pricing, and Contact were redesigned.** Landing now has a simulated MCQ/review preview and proof cards; Pricing uses plan/process cards; Contact uses support-routing cards, a signal card, form, and FAQ tiles.
3. **GSAP marketing motion was broadened.** The existing marketing-page motion now covers the new visual/card systems while preserving `prefers-reduced-motion` gating.
4. **Static cache bust bumped.** `index.html` app-version is `2026-06-28.05-local`; the new SVGs are included in `sw.js` precache.

**Files touched:** `main.js`, `styles.css`, `index.html`, `sw.js`, `CHANGELOG.md`, `AGENTS.md`, `Assets/branding/about-*.svg`.

### 2026-06-28 — Public About and Features refresh
Expanded the public marketing routes while preserving the static GitHub Pages SPA model.

1. **Features is now a polished marketing page.** The route uses a large hero, proof chips, and premium feature cards covering focused block creation, exam rhythm, review, analytics, and admin workflows.
2. **About now tells the MedBank story.** Added stronger positioning copy, an "Our start" vertical timeline with milestone/date labels, and principle cards for the product direction.
3. **GSAP page motion was extended.** Marketing pages now animate hero text, feature cards, and the About timeline rail/nodes through existing GSAP runtime hooks, with reduced-motion gating intact.
4. **Local cache bust bumped.** `index.html` app-version is `2026-06-28.04-local` for preview testing.

**Files touched:** `main.js`, `styles.css`, `index.html`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-28 — MedBank identity refresh
Renamed the public-facing product identity from the previous university-branded name to MedBank while preserving the static GitHub Pages deployment model.

1. **Visible identity is now MedBank.** Page title, meta descriptions, nav brand, landing hero, public route copy, admin/report labels, manifest name, docs, and package metadata now use MedBank naming.
2. **Brand assets were refreshed.** Added `Assets/branding/medbank-logo.png` and `.svg`, updated landing/social/precache references, and regenerated the hero brand asset without university-specific text.
3. **Deployment path remains unchanged.** Canonical URLs still point to `/o6u-medbank-app/` until the GitHub repository/pages path is renamed.
4. **Local cache bust bumped.** `index.html` app-version is `2026-06-28.03-local` for preview testing.

**Files touched:** `index.html`, `main.js`, `bootstrap.js`, `sw.js`, `manifest.webmanifest`, `package.json`, `package-lock.json`, `README.md`, `CHANGELOG.md`, `AGENTS.md`, `styles.css`, SQL/docs snapshots, and `Assets/branding/*`.

### 2026-06-28 — Typography refresh
Replaced the playful heading font with a cleaner, more premium medical-study
font pairing.

1. **Headings now use Geist.** The app loads Geist 400/500/600/700 from Google
   Fonts and routes `--font-heading`, `--font-display`, and admin display text
   through it.
2. **MCQ reading stays on Inter.** Body text, stems, options, explanations,
   buttons, and admin UI continue using Inter for high readability.
3. **Font weights are explicit.** Both Geist and Inter now load 400/500/600/700
   to avoid browser-synthesized semi-bold/bold text across dashboards and exam
   surfaces.
4. **Static cache bust bumped.** `index.html` app-version is `2026-06-28.01`.

**Files touched:** `index.html`, `styles.css`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-27 — Student content loading speed
Reduced how often approved students are held on the "Checking Your Course Bank"
loading panel while Supabase content sync is still running.

1. **The dashboard can render during sync.** The student dashboard no longer
   blocks on the full question-bank refresh after access checks pass; its
   question-bank stat shows a small syncing indicator until questions arrive.
2. **Usable cached question banks can render immediately.** Create-test and
   analytics readiness now checks whether the current student already has
   assigned courses and usable published questions locally before showing a
   blocking loading panel.
3. **First-load safety stays intact.** Students with no usable local content
   still wait for the first Supabase refresh instead of seeing a false empty
   state in create-test/analytics, and real query errors still surface when
   there is no local fallback.
4. **Background sync is preserved.** The refresh continues to run and the
   existing sync status/button show that updates are in progress.
5. **Static cache bust bumped.** `index.html` app-version is `2026-06-27.03`.

**Files touched:** `main.js`, `index.html`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-27 — Custom font system
Replaced the older Manrope/Sora CSS import with a static-SPA-friendly Google
Fonts setup in `index.html` and centralized font variables in `styles.css`.

1. **Fonts load from the document head.** The app now preconnects to Google
   Fonts and requests only Bricolage Grotesque 500/700 and Inter 400/500 with
   `display=swap`; no CSS `@import` is used.
2. **Typography is routed through variables.** `--font-heading` and
   `--font-body` drive the app, with the older UI/display/admin variables kept
   as aliases so existing selectors remain maintainable.
3. **Reading surfaces stay body-focused.** MCQ stems, answer options,
   explanations, and rationales explicitly use Inter even when an option is
   implemented as a button.
4. **Static cache bust bumped.** `index.html` app-version is `2026-06-27.02`.

**Files touched:** `index.html`, `styles.css`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-27 — GSAP animation runtime
Installed the official GSAP agent skills into `.agents/skills/` and wired GSAP
into the static SPA without changing the deploy model.

1. **GSAP loads through the existing bootstrap path.** `bootstrap.js` now loads
   GSAP 3.13 and ScrollTrigger from public CDNs in the background, registers
   ScrollTrigger when present, and leaves the CSS motion fallback active if the
   CDN is unavailable.
2. **Route and card motion now use GSAP when available.** `main.js` adds
   GSAP-powered route intro timelines, card hover movement, and ScrollTrigger
   reveal hooks for offscreen cards. Admin, exam session, and review surfaces
   stay conservative.
3. **Accessibility fallback is preserved.** `prefers-reduced-motion` skips GSAP
   motion, and the existing CSS route animation remains the fallback.
4. **Static cache bust bumped.** `index.html` app-version is `2026-06-27.01`.

**Files touched:** `bootstrap.js`, `main.js`, `styles.css`, `index.html`,
`CHANGELOG.md`, `AGENTS.md`, `skills-lock.json`, `.agents/skills/*`.

### 2026-06-22 — Admin user create refresh fix
Fixed the admin Users dashboard race where a newly added/edited local user could
briefly appear, then lose admin-entered fields after the next Supabase profile
refresh.

1. **Recent admin user data is protected during relational hydration.**
   `hydrateRelationalProfiles()` now actually applies the existing
   `shouldPreferRecentLocalUserData()` decision when resolving name, role,
   phone, approval/access flags, year/semester, and assigned courses. This keeps
   freshly entered admin form data from being overwritten by stale or incomplete
   profile rows while Supabase catches up.
2. **False student access issues are avoided during the same short window.**
   Missing-enrollment diagnostics are delayed while recent local enrollment data
   is intentionally preferred.
3. **Safe merge diagnostics were added.** The debug log reports only profile
   id/email/role and which field groups were protected; it does not log
   passwords, tokens, question data, or secrets.
4. **Static cache bust bumped.** `index.html` app-version is `2026-06-22.03`.

**Files touched:** `main.js`, `index.html`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-22 — Mobile responsiveness polish
Scoped CSS-only mobile refinements. No business logic, Supabase, auth,
enrollment, course, question, video, or desktop layout behavior was changed.

1. **MCQ answer controls are easier to tap on phones.** The existing mobile
   exam media query now gives radio controls, answer text, and submit actions
   larger touch targets while preserving the desktop exam layout.
2. **Admin side navigation has a mobile scroll affordance.** The admin sidebar
   horizontal tab rail now fades at the right edge on phones, making it clearer
   that additional admin sections can be swiped into view.
3. **Static cache bust bumped.** `index.html` app-version is `2026-06-22.02`
   so clients fetch the updated mobile stylesheet.
4. **Browser checks performed.** Verified public auth, student launcher/MCQ
   dashboard, Courses dashboard, lesson placeholder, MCQ session/review,
   student profile, and admin dashboard/users at phone widths with Playwright.

**Files touched:** `styles.css`, `index.html`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-22 — Student content access reliability
Fixed stale/early empty states for approved enrolled students.

1. **Auth/content warmup now waits for first student content refresh.** The
   post-auth path awaits the existing boot refresh that loads profile,
   enrollment, courses/topics, and questions before dashboard/create-test can
   claim content is empty.
2. **Question hydration has explicit read state.** `main.js` now tracks
   student question-read status as `idle`, `loading`, `success`, or `error`.
   Dashboard, create-test, and analytics use this to distinguish loading,
   access issues, true zero questions, and query/database errors.
3. **Safe diagnostics added.** Access-decision logs include route, status, and
   row counts only. They do not log question stems, answers, tokens, or secrets.
4. **Courses platform admin enrollment changes now signal students.** Admin
   approve/enroll/remove flows queue the existing student refresh signal with
   `platform_*` keys, and students reload Courses platform data when those keys
   arrive.
5. **Static cache bust bumped.** `index.html` app-version is `2026-06-22.01`.

**Files touched:** `main.js`, `index.html`, `CHANGELOG.md`, `AGENTS.md`.

### 2026-06-18 — Safety & tooling pass (no behavior change to live site)
Performed a multi-part hardening/cleanup pass. **The live site was not affected:
no served file changed behaviorally.** All changes are reversible.

1. **innerHTML / XSS escaping audit (VERIFIED CLEAN — no patches needed).**
   Enumerated all 60 `.innerHTML` assignments and every `${...}` interpolation
   in HTML/attribute/style context. Findings:
   - `escapeHtml()` (main.js ~L40314) is used 525×; discipline is strong.
   - The one field that appeared unescaped — `choice.id` at the session/review
     render sites (e.g. L23624–23635, L24863–24865) — is provably safe: every
     code path into rendering passes through `normalizeQuestionChoiceEntries` →
     `normalizeQuestionChoiceLabel`, which whitelists the label to exactly
     `["A","B","C","D","E"]`. Any other value is discarded. So `choice.id` can
     never carry markup.
   - All `href=`/`src=`/`style=`/`data-action=` interpolations resolve to static
     literals, numerics, or already-escaped values.
   - **No edits to `main.js` were required.** No fabricated patches were added.

2. **esbuild + ESLint tooling scaffolded (deploy NOT flipped).** Added
   `package.json`, `build/esbuild.config.js`, `eslint.config.cjs`. The committed
   `main.js` stays the served source of truth; `dist/` is gitignored.

3. **CI extended.** `.github/workflows/validate-changes.yml` now runs
   `npm run lint` and `npm run build` in addition to the existing `node --check`
   + file-existence checks. Live deploy model unchanged.

4. **`/api` Node admin layer deprecated in place.** Added `@deprecated` headers
   to `api/*.js` pointing to the canonical Edge Functions. Files retained for
   the optional Vercel/Netlify hosting path. README updated with a
   "Canonical admin endpoints" note.

5. **Schema snapshots marked non-authoritative.** Added banner comments to root
   `schema.sql` and `database/schema.sql` clarifying they are historical
   snapshots and that `supabase/migrations/` is canonical. No SQL content
   changed.

6. **Cross-tool docs added.** Created this `AGENTS.md` and `CHANGELOG.md`.

**Files touched:** `AGENTS.md`, `CHANGELOG.md`, `README.md`, `package.json`,
`build/esbuild.config.js`, `eslint.config.cjs`, `.gitignore`,
`.github/workflows/validate-changes.yml`, `api/_supabase.js`,
`api/admin-delete-user.js`, `api/admin-set-user-access.js`,
`api/admin-set-user-password.js`, `schema.sql`, `database/schema.sql`.
**Files NOT touched (behaviorally):** `index.html`, `main.js`, `bootstrap.js`,
`supabase.config.js`, `sw.js`, `styles.css`, all migrations, all Edge Functions.

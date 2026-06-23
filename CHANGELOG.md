# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.5.1] — 2026-06-23

### Fixed

#### Version display (all pages)
- Service worker cache name updated from `luxus-wc-v0.4.3` to `luxus-wc-v0.5.1` — the stale cache name meant the SW was serving old cached copies of `version.js` (and all other static assets) on cache-first requests, so footer version numbers were stuck at a previous build; bumping the cache name forces the activate handler to delete the old cache and re-fetch all assets

#### Group standings (`groups.html`)
- Groups grid switched from `repeat(auto-fill, minmax(320px, 1fr))` to `repeat(2, 1fr)` on desktop — each group card is now wider and all columns have room to breathe
- On mobile (≤ 768 px) the grid collapses to a single column
- Table wrapped in a `.group-table-wrap` div with `overflow-x: auto` and `-webkit-overflow-scrolling: touch` — on narrow viewports the table scrolls horizontally within each card rather than truncating
- `min-width: 480px` added to `.group-table` so all nine columns (Team, P, W, D, L, GF, GA, GD, Pts) are always fully visible
- Team name column (`min-width: 160px`) no longer truncates — removed `overflow: hidden` / `text-overflow: ellipsis` / `white-space: nowrap` from `.gt-name`; `white-space: nowrap` kept so the name stays on one line rather than wrapping
- Cell padding increased (`.gt-row td`: `.55rem .65rem`; `.gt-team`: `.55rem .65rem .55rem .85rem`) for more breathing room
- Stat column width increased from `28px` to `36px` (`gt-num`, `gt-pts`) to accommodate two-digit values without crowding
- Sweepstake owner badge remains visible alongside each team name — no structural changes to badge rendering

---

## [0.5.0] — 2026-06-16

### Changed

#### Bracket (`bracket.html`, `js/bracket.js`, `css/style.css`)
- Replaced horizontal scroll with **drag-to-pan** navigation — click and drag to move the bracket canvas
- Added **pinch-to-zoom** on mobile (two-finger gesture) and **scroll-wheel zoom** on desktop; scale clamped to 0.3 × – 1.5 ×
- Bracket **auto-centres on first load** at the largest scale that fits the viewport width (≤ 1 ×)
- Outer `.bracket-scroll` (overflow-x) replaced by `.bracket-viewport` (overflow: hidden) containing a `.bracket-inner` div; CSS transform: translate() scale() applied to `.bracket-inner`
- Canvas connector lines corrected to remain accurate at any zoom level (positions divided by current scale before drawing)
- Removed scroll-hint bar (no longer applicable)
- `SLOT_PX` constant renamed `UNIT`; added `SCALE_MIN` / `SCALE_MAX` constants

---

## [0.4.4] — 2026-06-16

### Changed

#### Upcoming Fixtures page (`upcoming.html`)
- Removed "Sweepstake Only" toggle filter; remaining time filters (Next 24 Hours, Today, Tomorrow, All Upcoming) are unchanged
- Added **Results** filter button alongside the time filters — selecting it shows all completed matches in reverse chronological order (most recent first); a "Recent Results" section is also permanently rendered below the upcoming list when any time filter is active
- BST time and **date** are now both computed correctly: when converting a kick-off from venue local time to BST, the calendar date is advanced if the +1 h offset crosses midnight (e.g. 23:30 UTC on the 15th → 00:30 BST on the 16th)

### Fixed

#### BST date rollover (all pages)
- `matchToBST(date, time)` added to `api.js` — returns `{date, time}` in BST, properly handling midnight rollover by computing the full UTC instant before adding +1 h
- `renderFixtureRow` in `app.js` and `dashboard.js` updated to use `matchToBST` so fixture dates on the Tracker and My Teams pages are also correct
- `renderMatchCard` in `bracket.js` updated likewise so bracket dates are correct
- `matchUtcTs` in `upcoming.js` fixed for the same midnight-rollover edge case (affects filter window membership, not just display)

---

## [0.4.3] — 2026-06-16

### Removed

#### Leaderboard
- Deleted `leaderboard.html` and `js/leaderboard.js` entirely
- Removed Leaderboard link from the desktop nav, mobile hamburger drawer, and footer on all pages (`index.html`, `dashboard.html`, `bracket.html`, `groups.html`, `upcoming.html`)

### Fixed

#### Bracket placeholder resolution
- Group position slots (`1A`, `2B`, `3C/D/F` etc.) now only resolve to a real team name once **all** group-stage matches for that group have been played and carry a final score — mid-group standings are no longer used to pre-fill bracket slots
- Knockout winner slots (`W73`, `W74` etc.) already required a final score; this invariant is preserved
- Knockout loser slots (`L101`, `L102` — third-place play-off) same rule
- Preview flag grids continue to show all candidate teams for any unresolved slot; they are hidden and replaced by the confirmed team name and flag only after the slot is definitively resolved
- `computeGroupComplete()` helper added to `api.js` to determine per-group completion status; `resolveTeam()` and `getPotentialTeams()` accept an optional `groupComplete` map that enables the strict resolution mode used by the bracket

---

## [0.4.2] — 2026-06-13

### Added

#### Upcoming Fixtures page (`upcoming.html`)
- Full-page fixture list showing all upcoming and recent matches with sweepstake context
- **Default view — Next 24 hours**: shows all fixtures kicking off in the next 24 h BST; auto-falls back to the next 5 upcoming fixtures if the window is empty; falls back to the 5 most recently played matches if the tournament is over
- **Fixture cards** display both team names with flags (flagcdn.com), BST kick-off time and date, venue, score + FT badge once played, and WIN/DRAW/LOSS badge per sweepstake team once the result is known
- Coloured owner badge next to each team showing their sweepstake participant; teams with no owner show no badge
- Cards involving at least one sweepstake team are highlighted with a gold border and subtle gold background tint; non-sweepstake fixtures use the standard card style
- **Filters** at the top of the page: Next 24 Hours (default) · Today · Tomorrow · All Upcoming · Sweepstake Only (combinable toggle)
- Clean vertical card list, max 700 px centred, responsive single-column on mobile
- Status pill (loading / live / cached / error) and manual Refresh button, consistent with all other pages
- Auth-guarded — unauthenticated visitors are redirected to `welcome.html`
- "Upcoming" link added to the desktop nav, mobile hamburger drawer, and footer on all pages

---

## [0.4.1] — 2026-06-13

### Fixed

#### Mobile nav bar
- "Luxus WC 2026" title now correctly centred on mobile — hamburger button is absolutely positioned at the right edge so the title occupies the full width and sits dead-centre
- Raised mobile nav breakpoint from 700 px to 768 px to cover all common phone and small-tablet widths

#### Mobile bracket
- Removed nested `overflow-x: auto` from `.bracket-page main` that was creating a second scroll container and producing duplicate scrollbars
- Added `overflow-y: clip` to `.bracket-scroll` to prevent the browser promoting the container to an `overflow-y: auto` scroll box
- Added `-webkit-overflow-scrolling: touch` for smooth momentum scrolling on iOS and Android

#### General mobile polish
- Settings drawer expanded to full viewport width on screens ≤ 768 px
- Upcoming fixtures banner (`welcome.html`) given `-webkit-overflow-scrolling: touch` for smooth swipe scrolling on iOS
- Bracket spacing and card sizing improved (cards ≥ 200 px wide, 40 px column gaps, 150 px slot height) for comfortable mobile browsing

---

## [0.3.0] — 2026-06-13

### Added

#### Leaderboard (`leaderboard.html`)
- Full standings table for all 23 participants, sorted by points (then wins, then name)
- Gold / silver / bronze medals for top 3 ranks
- Coloured avatar initial next to each participant name
- Team flag row with eliminated teams greyed out and desaturated
- Points, W/D/L match record, and teams-alive count columns
- Stat columns hidden on mobile to keep table readable

#### Group standings (`groups.html`)
- Live standings table for all 12 groups (A–L), driven by match data
- Columns: Team, P, W, D, L, GF, GA, GD, Pts
- Row colour coding: green (top 2 — auto qualify), amber (3rd — potential best 3rd), no highlight (4th — eliminated)
- Sweepstake owner badge next to each team name
- Colour key legend above the grid
- Responsive auto-fill grid (min 320 px per group table)

#### PWA support
- `manifest.json`: installable app — name "Luxus WC 2026", theme/background `#0e1b2e`, standalone display
- `sw.js`: service worker — network-first for the scores API, cache-first for all static assets and CDN resources; pre-caches all pages on install; cleans stale caches on activate
- `generate-icons.html`: developer tool that draws 192 × 192 and 512 × 512 trophy icons on canvas and provides download buttons; place outputs in `icons/` folder
- Apple PWA meta tags on all pages (`apple-mobile-web-app-capable`, status bar style, apple-touch-icon)
- Service worker registration script added to all pages

#### General polish
- Skeleton loading state: grey shimmer placeholder cards shown in grids while data is being fetched, replacing blank space
- Smooth card load-in: `cardIn` fade-up animation on `.person-card` and `.team-card`, with staggered delay up to 12 items
- Bracket: **Hide / Show preview flags** toggle button next to the status bar
- Bracket: scroll-hint text below the bracket on mobile viewports, hidden once the user scrolls
- Nav updated to five links on all pages: **My Teams · Tracker · Bracket · Groups · Leaderboard**; wraps gracefully on mobile
- `js/api.js`: `getTeamRecord()` and `isTeamEliminated()` added as shared utilities

---

## [0.2.0] — 2026-06-13

### Added

#### Welcome screen (`welcome.html`)
- Full-screen name-gate splash before entering the site
- Plain text input with no autocomplete, dropdown, or suggestions
- Case-insensitive, whitespace-trimmed name matching
- Shake animation and inline error message on unrecognised input
- Redirects to dashboard on success; name stored to `localStorage` (`luxus_wc_user`)
- Already-logged-in users skipped straight to dashboard

#### Personal dashboard (`dashboard.html`)
- "Welcome back, [Name] 👋" header and live total-points banner
- Team cards for each of the logged-in user's sweepstake teams
- Full fixture list per team across all stages, with scores and WIN/DRAW/LOSS badges
- Same status pill and manual Refresh as the company tracker

#### Auth & navigation
- `js/auth.js`: shared `getUser()`, `logout()`, `populateNavUser()` utilities
- Auth guard (inline `<head>` script) on `index.html`, `bracket.html`, and `dashboard.html` — unauthenticated visitors are redirected to `welcome.html`
- Unified three-link nav on all pages: **My Teams · Company Tracker · Bracket**
- Logged-in name displayed on the right of the nav with a **Not you?** button that clears the session and returns to the welcome screen

---

## [0.1.0] — 2026-06-13

### Added

#### Sweepstakes page (`index.html`)
- Person cards for all 23 participants with coloured avatar initials
- Each card shows all owned teams with country flags (flagcdn.com)
- All fixtures per team, grouped by stage: Group Stage → R32 → R16 → QF → SF → Final
- Dates in `Www DD Mon` format; kick-off times converted from venue local to BST (UTC+1)
- WIN / DRAW / LOSS badge and score once a match is played
- Points per team (3 win, 1 draw) and total points on card header
- Four sort/filter modes: Person A–Z (default), Team A–Z, By Group, By Points
- Live search box filtering by person name or team name
- Responsive auto-fill card grid (min 280 px per card)

#### Knockout bracket (`bracket.html`)
- Mirrored bracket: R32 → R16 → QF → SF → Final (centre) ← SF → QF → R16 → R32
- Third-place play-off below the Final in the centre column
- Each match card: match number, date, BST time, venue, both teams with flags
- Score and green-highlighted winner row once played
- Coloured owner dot next to each team name
- Small potential-team flag previews (20×15 px, with hover tooltips) for unresolved bracket slots
- Canvas connector lines linking rounds
- Owner colour legend below bracket
- Horizontally scrollable on narrow viewports

#### Data & infrastructure
- Live match data fetched from `openfootball/worldcup.json` with `?_=Date.now()` cache-bust
- `localStorage` fallback cache; error notice shown if live fetch fails
- Status pill: loading / live (with timestamp) / cached / error states
- Manual Refresh button
- Group standings computed dynamically from match results
- Placeholder bracket codes (`1A`, `2B`, `W73` etc.) resolved to real team names as tournament progresses
- Version number displayed in footer, sourced from `js/version.js`
- GitHub Actions workflow (`.github/workflows/deploy.yml`) for zero-config GitHub Pages deployment
- Dark navy design with Inter font and per-person colour scheme

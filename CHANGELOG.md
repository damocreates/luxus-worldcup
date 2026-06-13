# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

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

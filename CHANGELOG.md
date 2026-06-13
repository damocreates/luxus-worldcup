# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

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

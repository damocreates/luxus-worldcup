# World Cup 2026 Sweepstakes Tracker

A static website that tracks a company sweepstakes for the FIFA World Cup 2026, hosted on GitHub Pages.

## Pages

| Page | Description |
|---|---|
| `index.html` | Sweepstakes — every participant's teams with live fixtures, scores, and points |
| `bracket.html` | Knockout bracket — visual R32 → Final bracket with owner badges |

## Features

- **Live data** fetched from the open [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) API on every page load
- **BST kick-off times** — all UTC venue times converted to British Summer Time (UTC+1)
- **Group standings** computed dynamically from match results
- **Points tracking** — 3 pts (win), 1 pt (draw), across all stages
- **Four sort/filter views** — Person A–Z, Team A–Z, By Group, By Points
- **Live search** — filter by person name or team name
- **Knockout bracket** with canvas connector lines, owner badges, and potential-team flag previews for unresolved slots
- **Offline fallback** — last-fetched data cached in `localStorage`; error notice shown if live fetch fails
- **Status pill** — shows loading / live / cached / error state with last-updated timestamp
- **Responsive** — card grid auto-fills from 280 px; bracket scrolls horizontally on mobile

## Deploy to GitHub Pages

### Automatic (recommended)

1. Push this repo to GitHub with the default branch named `main`
2. In your repository settings, go to **Settings → Pages**
3. Set **Source** to **GitHub Actions**
4. Any push to `main` will trigger `.github/workflows/deploy.yml` and deploy the site automatically

### Manual

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then enable GitHub Pages via the repository settings as described above.

## Local development

No build step needed — just open `index.html` in a browser.

> **Note:** browsers block `fetch()` for `file://` URLs. Use a local server:
>
> ```bash
> npx serve .
> # or
> python3 -m http.server 8000
> ```

## Versioning

The current version is stored in [`js/version.js`](js/version.js). Bump it there and update [`CHANGELOG.md`](CHANGELOG.md) for every release.

| Bump | When |
|---|---|
| PATCH | Bug fixes |
| MINOR | New features, backwards-compatible |
| MAJOR | Significant redesigns |

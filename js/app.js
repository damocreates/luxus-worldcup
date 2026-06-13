// ── Sweepstakes page ──────────────────────────────────────────────────────────

const STAGE_ORDER = ['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

// Page state
let appState = {
  matches:    [],
  standings:  {},
  byNum:      {},
  view:       'person',
  search:     '',
};

// ── Status helpers ────────────────────────────────────────────────────────────

function setStatus(type, msg) {
  const pill = document.getElementById('status-pill');
  pill.className = `status-pill status-${type}`;
  pill.textContent = msg;
}

function showError(msg) {
  const el = document.getElementById('error-notice');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-notice').classList.add('hidden');
}

// ── Data loading ──────────────────────────────────────────────────────────────

function renderSkeleton() {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 6 }, () => `
    <div class="skeleton-card">
      <div class="skel-header">
        <div class="skel-avatar"></div>
        <div style="flex:1">
          <div class="skel-line" style="width:55%"></div>
          <div class="skel-line" style="width:35%"></div>
        </div>
      </div>
      <div class="skel-line" style="margin-top:.5rem"></div>
      <div class="skel-line" style="width:75%"></div>
      <div class="skel-line" style="width:55%"></div>
    </div>`).join('');
}

async function loadData(refresh = false) {
  setStatus('loading', 'Loading…');
  hideError();
  renderSkeleton();

  // Always pre-load cache so Refresh also has a fallback if the fetch fails
  const cached = getCachedData();
  let matches   = cached ? cached.matches : null;
  let fromCache = !!cached;
  if (cached) appState.cacheTs = cached.timestamp;

  try {
    matches = await fetchWorldCupData();
    fromCache = false;
  } catch (err) {
    if (!matches) {
      setStatus('error', 'Failed to load data');
      showError('Could not fetch live data and no cached data is available. Please check your connection and try again.');
      return;
    }
    const ts = appState.cacheTs ? new Date(appState.cacheTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
    setStatus('cached', `Cached data${ts ? ' · Updated ' + ts : ''}`);
    showError('Live data fetch failed — showing last cached data.');
  }

  appState.matches   = matches;
  appState.standings = computeStandings(matches);
  appState.byNum     = buildMatchIndex(matches);

  if (!fromCache) {
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setStatus('live', `Live data · Updated ${ts}`);
  }

  renderPage();
}

// ── Render orchestrator ───────────────────────────────────────────────────────

function renderPage() {
  const { view, search, matches, standings, byNum } = appState;
  const q = search.toLowerCase().trim();

  const gridEl    = document.getElementById('cards-grid');
  const sectionsEl = document.getElementById('group-sections');

  if (view === 'person' || view === 'points') {
    sectionsEl.innerHTML = '';
    gridEl.style.display = '';

    let persons = Object.keys(SWEEPSTAKE);
    if (view === 'person') persons.sort();
    if (view === 'points') {
      persons.sort((a, b) =>
        getPersonPoints(b, matches, standings, byNum) -
        getPersonPoints(a, matches, standings, byNum)
      );
    }

    if (q) {
      persons = persons.filter(p =>
        p.toLowerCase().includes(q) ||
        (SWEEPSTAKE[p] || []).some(t => t.toLowerCase().includes(q))
      );
    }

    gridEl.innerHTML = persons.length
      ? persons.map(p => renderPersonCard(p)).join('')
      : '<div class="empty-state">No results match your search.</div>';

  } else if (view === 'team') {
    sectionsEl.innerHTML = '';
    gridEl.style.display = '';

    let teams = Object.values(SWEEPSTAKE).flat().sort();
    if (q) {
      teams = teams.filter(t =>
        t.toLowerCase().includes(q) ||
        (TEAM_OWNER[t] || '').toLowerCase().includes(q)
      );
    }

    gridEl.innerHTML = teams.length
      ? teams.map(t => renderTeamCard(t)).join('')
      : '<div class="empty-state">No results match your search.</div>';

  } else if (view === 'group') {
    gridEl.style.display = 'none';
    gridEl.innerHTML = '';

    const groups = getGroupNames(standings);
    // Fall back to deriving group list from matches if standings not populated
    const allGroups = groups.length ? groups : deriveGroups();

    let html = '';
    for (const g of allGroups) {
      const teamsInGroup = (standings[g] || []).map(r => r.team);
      // If no standings yet, fall back to match data
      const fallback = teamsInGroup.length ? teamsInGroup : deriveTeamsInGroup(g);
      const filtered = q
        ? fallback.filter(t =>
            t.toLowerCase().includes(q) ||
            (TEAM_OWNER[t] || '').toLowerCase().includes(q)
          )
        : fallback;
      if (!filtered.length) continue;
      html += `<div class="group-section">
        <h2 class="group-heading">${g}</h2>
        <div class="cards-grid">${filtered.map(t => renderTeamCard(t)).join('')}</div>
      </div>`;
    }

    sectionsEl.innerHTML = html || '<div class="empty-state">No results match your search.</div>';
  }
}

function deriveGroups() {
  const set = new Set();
  for (const m of appState.matches) {
    if (m.group) set.add(m.group);
  }
  return [...set].sort();
}

function deriveTeamsInGroup(group) {
  const set = new Set();
  for (const m of appState.matches) {
    if (m.group === group) {
      set.add(normalizeTeamName(m.team1));
      set.add(normalizeTeamName(m.team2));
    }
  }
  return [...set].sort();
}

// ── Person card ───────────────────────────────────────────────────────────────

function renderPersonCard(person) {
  const { matches, standings, byNum } = appState;
  const teams   = SWEEPSTAKE[person] || [];
  const color   = PERSON_COLORS[person] || '#888';
  const initials = getInitials(person);

  let totalPts = 0;
  const teamSections = teams.map(team => {
    const pts = getTeamPoints(team, matches, standings, byNum);
    totalPts += pts;
    return renderTeamSection(team, pts);
  }).join('');

  return `
    <div class="person-card" style="--accent:${color}">
      <div class="card-header">
        <div class="avatar" style="background:${color}20;color:${color}">${initials}</div>
        <div class="card-title">
          <span class="person-name">${escHtml(person)}</span>
          <span class="card-subtitle">${teams.length} team${teams.length !== 1 ? 's' : ''}</span>
        </div>
        <span class="total-pts-badge">${totalPts} pts</span>
      </div>
      <div class="card-body">${teamSections}</div>
    </div>`;
}

function renderTeamSection(team, pts) {
  const { matches, standings, byNum } = appState;
  const flagUrl = getFlagUrl(team, '24x18');
  const flagImg = flagUrl ? `<img src="${flagUrl}" width="24" height="18" alt="${escHtml(team)}" loading="lazy">` : '';
  const owner   = TEAM_OWNER[team] || '';
  const color   = owner ? PERSON_COLORS[owner] : '#888';

  const byRound = getTeamFixtures(team, matches, standings, byNum);

  let roundsHtml = '';
  for (const stage of STAGE_ORDER) {
    const fixtures = byRound[stage];
    if (!fixtures || !fixtures.length) continue;
    roundsHtml += `<div class="round-label">${stage}</div>`;
    roundsHtml += fixtures.map(({ match, isTeam1 }) => renderFixtureRow(match, isTeam1, team)).join('');
  }

  if (!roundsHtml) {
    roundsHtml = '<div style="font-size:.78rem;color:var(--muted);padding:.3rem 0">No fixtures found</div>';
  }

  return `
    <div class="team-section">
      <div class="team-section-header">
        ${flagImg}
        <span class="team-section-name">${escHtml(team)}</span>
        <span class="team-pts">${pts} pts</span>
      </div>
      <div class="fixtures">${roundsHtml}</div>
    </div>`;
}

function renderFixtureRow(match, isTeam1, _teamName) {
  const { standings, byNum } = appState;

  const opp = isTeam1
    ? (match.resolvedTeam2 || normalizeTeamName(match.team2))
    : (match.resolvedTeam1 || normalizeTeamName(match.team1));

  const oppFlagUrl = getFlagUrl(opp, '20x15');
  const oppFlagImg = oppFlagUrl
    ? `<img src="${oppFlagUrl}" width="20" height="15" alt="${escHtml(opp)}" loading="lazy">`
    : '';

  const dateStr = formatDate(match.date);
  const bstTime = timeToBST(match.time);

  let resultHtml = '';
  if (match.score && match.score.ft) {
    const [s1, s2] = match.score.ft;
    const myS  = isTeam1 ? s1 : s2;
    const oppS = isTeam1 ? s2 : s1;
    const result = getMatchResult(match, isTeam1);
    resultHtml = `
      <span class="fixture-result">
        <span class="fixture-score">${myS}–${oppS}</span>
        <span class="badge badge-${result}">${result.toUpperCase()}</span>
      </span>`;
  }

  return `
    <div class="fixture">
      <span class="fixture-date">${dateStr}</span>
      <span class="fixture-time">${bstTime || 'TBD'}</span>
      <span class="fixture-opp">${oppFlagImg}<span class="fixture-opp-name">${escHtml(opp || '?')}</span></span>
      ${resultHtml}
    </div>`;
}

// ── Team card ─────────────────────────────────────────────────────────────────

function renderTeamCard(team) {
  const { matches, standings, byNum } = appState;
  const owner    = TEAM_OWNER[team] || '';
  const color    = owner ? PERSON_COLORS[owner] : '#6b82a0';
  const flagUrl  = getFlagUrl(team, '32x24');
  const flagImg  = flagUrl ? `<img src="${flagUrl}" width="32" height="24" alt="${escHtml(team)}" loading="lazy">` : '';
  const pts      = getTeamPoints(team, matches, standings, byNum);
  const group    = getTeamGroup(team, matches) || '';

  const byRound = getTeamFixtures(team, matches, standings, byNum);
  let roundsHtml = '';
  for (const stage of STAGE_ORDER) {
    const fixtures = byRound[stage];
    if (!fixtures || !fixtures.length) continue;
    roundsHtml += `<div class="round-label">${stage}</div>`;
    roundsHtml += fixtures.map(({ match, isTeam1 }) => renderFixtureRow(match, isTeam1, team)).join('');
  }

  if (!roundsHtml) {
    roundsHtml = '<div style="font-size:.78rem;color:var(--muted);padding:.3rem 0">No fixtures found</div>';
  }

  const ownerBadge = owner ? `
    <span class="owner-badge" style="color:${color};border-color:${color}40;background:${color}18">${escHtml(owner)}</span>` : '';

  return `
    <div class="team-card" style="--accent:${color}">
      <div class="card-header">
        ${flagImg}
        <div class="card-title">
          <span class="card-team-name">${escHtml(team)}</span>
          <span class="card-subtitle">${group}</span>
        </div>
        ${ownerBadge}
        <span class="total-pts-badge">${pts} pts</span>
      </div>
      <div class="card-body">
        <div class="fixtures">${roundsHtml}</div>
      </div>
    </div>`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Wiring ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Version
  const vEl = document.getElementById('version-display');
  if (vEl) vEl.textContent = VERSION;

  populateNavUser();

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.view = btn.dataset.view;
      renderPage();
    });
  });

  // Search
  const searchEl = document.getElementById('search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      appState.search = searchEl.value;
      renderPage();
    });
  }

  // Refresh
  document.getElementById('refresh-btn').addEventListener('click', () => loadData(true));

  // Initial load
  loadData(false);
});

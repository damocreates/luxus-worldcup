// ── Dashboard page ────────────────────────────────────────────────────────────

const STAGE_ORDER_DASH = ['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

let dashState = {
  person:    null,
  matches:   [],
  standings: {},
  byNum:     {},
  cacheTs:   0,
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Status helpers ────────────────────────────────────────────────────────────

function setStatus(type, msg) {
  const pill = document.getElementById('status-pill');
  if (pill) { pill.className = `status-pill status-${type}`; pill.textContent = msg; }
}

function showError(msg) {
  const el = document.getElementById('error-notice');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function hideError() {
  const el = document.getElementById('error-notice');
  if (el) el.classList.add('hidden');
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadData(refresh = false) {
  setStatus('loading', 'Loading…');
  hideError();

  const cached  = getCachedData();
  let matches   = cached ? cached.matches : null;
  let fromCache = !!cached;
  if (cached) dashState.cacheTs = cached.timestamp;

  try {
    matches   = await fetchWorldCupData();
    fromCache = false;
  } catch (_err) {
    if (!matches) {
      setStatus('error', 'Failed to load data');
      showError('Could not fetch live data and no cached data is available. Please check your connection and try again.');
      return;
    }
    const ts = dashState.cacheTs
      ? new Date(dashState.cacheTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '';
    setStatus('cached', `Cached data${ts ? ' · Updated ' + ts : ''}`);
    showError('Live data fetch failed — showing last cached data.');
  }

  dashState.matches   = matches;
  dashState.standings = computeStandings(matches);
  dashState.byNum     = buildMatchIndex(matches);

  if (!fromCache) {
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setStatus('live', `Live data · Updated ${ts}`);
  }

  renderDashboard();
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderDashboard() {
  const { person, matches, standings, byNum } = dashState;
  if (!person) return;

  const teams    = SWEEPSTAKE[person] || [];
  const totalPts = getPersonPoints(person, matches, standings, byNum);

  const welcomeEl = document.getElementById('dashboard-welcome');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${person} 👋`;

  const ptsEl = document.getElementById('dashboard-pts');
  if (ptsEl) ptsEl.innerHTML = `🏆 ${totalPts} pts total`;

  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;

  grid.innerHTML = teams.length
    ? teams.map(team => renderTeamCard(team)).join('')
    : '<div class="empty-state">No teams assigned — contact the sweepstake organiser.</div>';
}

function renderTeamCard(team) {
  const { matches, standings, byNum } = dashState;
  const owner   = TEAM_OWNER[team] || '';
  const color   = owner ? PERSON_COLORS[owner] : '#6b82a0';
  const flagUrl = getFlagUrl(team, '32x24');
  const flagImg = flagUrl ? `<img src="${flagUrl}" width="32" height="24" alt="${escHtml(team)}" loading="lazy">` : '';
  const pts     = getTeamPoints(team, matches, standings, byNum);
  const group   = getTeamGroup(team, matches) || '';

  const byRound = getTeamFixtures(team, matches, standings, byNum);
  let roundsHtml = '';
  for (const stage of STAGE_ORDER_DASH) {
    const fixtures = byRound[stage];
    if (!fixtures || !fixtures.length) continue;
    roundsHtml += `<div class="round-label">${stage}</div>`;
    roundsHtml += fixtures.map(({ match, isTeam1 }) => renderFixtureRow(match, isTeam1)).join('');
  }

  if (!roundsHtml) {
    roundsHtml = '<div style="font-size:.78rem;color:var(--muted);padding:.3rem 0">No fixtures found</div>';
  }

  return `
    <div class="team-card" style="--accent:${color}">
      <div class="card-header">
        ${flagImg}
        <div class="card-title">
          <span class="card-team-name">${escHtml(team)}</span>
          <span class="card-subtitle">${group}</span>
        </div>
        <span class="total-pts-badge">${pts} pts</span>
      </div>
      <div class="card-body">
        <div class="fixtures">${roundsHtml}</div>
      </div>
    </div>`;
}

function renderFixtureRow(match, isTeam1) {
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

// ── Wiring ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const vEl = document.getElementById('version-display');
  if (vEl) vEl.textContent = VERSION;

  dashState.person = getUser();
  populateNavUser();

  document.getElementById('refresh-btn').addEventListener('click', () => loadData(true));

  loadData(false);
});

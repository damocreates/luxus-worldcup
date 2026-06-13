// ── Leaderboard page ──────────────────────────────────────────────────────────

let lbState = {
  matches:   [],
  standings: {},
  byNum:     {},
  cacheTs:   0,
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  renderSkeleton();

  const cached  = getCachedData();
  let matches   = cached ? cached.matches : null;
  let fromCache = !!cached;
  if (cached) lbState.cacheTs = cached.timestamp;

  try {
    matches   = await fetchWorldCupData();
    fromCache = false;
  } catch (_err) {
    if (!matches) {
      setStatus('error', 'Failed to load data');
      showError('Could not fetch live data and no cached data is available. Please check your connection and try again.');
      return;
    }
    const ts = lbState.cacheTs
      ? new Date(lbState.cacheTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '';
    setStatus('cached', `Cached data${ts ? ' · Updated ' + ts : ''}`);
    showError('Live data fetch failed — showing last cached data.');
  }

  lbState.matches   = matches;
  lbState.standings = computeStandings(matches);
  lbState.byNum     = buildMatchIndex(matches);

  if (!fromCache) {
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setStatus('live', `Live data · Updated ${ts}`);
  }

  renderLeaderboard();
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function renderSkeleton() {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;
  tbody.innerHTML = Array.from({ length: 8 }, () => `
    <tr class="skel-row">
      <td><div class="skel-line" style="width:28px"></div></td>
      <td><div class="skel-line" style="width:80px"></div></td>
      <td><div class="skel-line" style="width:60px"></div></td>
      <td><div class="skel-line" style="width:30px"></div></td>
      <td><div class="skel-line" style="width:22px"></div></td>
      <td><div class="skel-line" style="width:22px"></div></td>
      <td><div class="skel-line" style="width:22px"></div></td>
      <td><div class="skel-line" style="width:28px"></div></td>
    </tr>`).join('');
}

// ── Person stats ──────────────────────────────────────────────────────────────

function getPersonStats(person) {
  const { matches, standings, byNum } = lbState;
  const teams = SWEEPSTAKE[person] || [];
  let pts = 0, wins = 0, draws = 0, losses = 0, alive = 0;
  for (const team of teams) {
    pts += getTeamPoints(team, matches, standings, byNum);
    const rec = getTeamRecord(team, matches, standings, byNum);
    wins += rec.wins; draws += rec.draws; losses += rec.losses;
    if (!isTeamEliminated(team, matches, standings, byNum)) alive++;
  }
  return { pts, wins, draws, losses, alive };
}

// ── Rendering ─────────────────────────────────────────────────────────────────

const RANK_ICON = { 1: '🥇', 2: '🥈', 3: '🥉' };

function renderLeaderboard() {
  const persons = Object.keys(SWEEPSTAKE);

  const rows = persons.map(person => ({ person, ...getPersonStats(person) }));
  rows.sort((a, b) => {
    if (b.pts   !== a.pts)   return b.pts   - a.pts;
    if (b.wins  !== a.wins)  return b.wins  - a.wins;
    return a.person.localeCompare(b.person);
  });

  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;
  tbody.innerHTML = rows.map((row, i) => renderRow(row, i + 1)).join('');
}

function renderRow(row, rank) {
  const { person, pts, wins, draws, losses, alive } = row;
  const color    = PERSON_COLORS[person] || '#888';
  const initials = getInitials(person);

  const teamsHtml = (SWEEPSTAKE[person] || []).map(team => {
    const flagUrl    = getFlagUrl(team, '20x15');
    const eliminated = isTeamEliminated(team, lbState.matches, lbState.standings, lbState.byNum);
    const img = flagUrl
      ? `<img src="${flagUrl}" width="20" height="15" alt="${escHtml(team)}" loading="lazy"${eliminated ? ' class="flag-out"' : ''}>`
      : '';
    return `<span title="${escHtml(team)}">${img}</span>`;
  }).join('');

  const rankHtml = RANK_ICON[rank]
    ? `<span class="rank-medal">${RANK_ICON[rank]}</span>`
    : `<span class="rank-num">${rank}</span>`;

  return `
    <tr class="lb-row${rank <= 3 ? ' lb-top' : ''}">
      <td class="lb-rank">${rankHtml}</td>
      <td class="lb-person">
        <span class="avatar-sm" style="background:${color}20;color:${color}">${escHtml(initials)}</span>
        <span class="lb-name">${escHtml(person)}</span>
      </td>
      <td class="lb-teams">${teamsHtml}</td>
      <td class="lb-pts">${pts}</td>
      <td class="lb-stat lb-w">${wins}</td>
      <td class="lb-stat lb-d">${draws}</td>
      <td class="lb-stat lb-l">${losses}</td>
      <td class="lb-stat lb-alive">${alive}</td>
    </tr>`;
}

// ── Wiring ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const vEl = document.getElementById('version-display');
  if (vEl) vEl.textContent = VERSION;

  populateNavUser();
  document.getElementById('refresh-btn').addEventListener('click', () => loadData(true));
  loadData(false);
});

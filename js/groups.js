// ── Group standings page ──────────────────────────────────────────────────────

let groupsState = {
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
  if (cached) groupsState.cacheTs = cached.timestamp;

  try {
    matches   = await fetchWorldCupData();
    fromCache = false;
  } catch (_err) {
    if (!matches) {
      setStatus('error', 'Failed to load data');
      showError('Could not fetch live data and no cached data is available. Please check your connection and try again.');
      return;
    }
    const ts = groupsState.cacheTs
      ? new Date(groupsState.cacheTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '';
    setStatus('cached', `Cached data${ts ? ' · Updated ' + ts : ''}`);
    showError('Live data fetch failed — showing last cached data.');
  }

  groupsState.matches   = matches;
  groupsState.standings = computeStandings(matches);
  groupsState.byNum     = buildMatchIndex(matches);

  if (!fromCache) {
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setStatus('live', `Live data · Updated ${ts}`);
  }

  renderGroups();
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function renderSkeleton() {
  const grid = document.getElementById('groups-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 6 }, () => `
    <div class="group-block skeleton-card">
      <div class="group-block-title"><div class="skel-line" style="width:80px"></div></div>
      <div style="padding:.75rem">
        ${Array.from({ length: 4 }, () => `<div class="skel-line"></div>`).join('')}
      </div>
    </div>`).join('');
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderGroups() {
  const { standings } = groupsState;
  const groupNames = getGroupNames(standings);
  const grid = document.getElementById('groups-grid');
  if (!grid) return;

  if (!groupNames.length) {
    grid.innerHTML = '<div class="empty-state">No group stage data yet — check back once matches begin.</div>';
    return;
  }

  grid.innerHTML = groupNames.map(g => renderGroupTable(g)).join('');
}

function renderGroupTable(group) {
  const rows = groupsState.standings[group] || [];

  const rowsHtml = rows.map((row, i) => {
    const posClass = i < 2 ? 'gp-qualify' : i === 2 ? 'gp-maybe' : 'gp-out';
    const gd       = row.gf - row.ga;
    const gdStr    = gd > 0 ? `+${gd}` : String(gd);
    const owner    = TEAM_OWNER[row.team];
    const color    = owner ? PERSON_COLORS[owner] : '';
    const ownerBadge = owner
      ? `<span class="owner-badge" style="color:${color};border-color:${color}40;background:${color}18">${escHtml(owner)}</span>`
      : '';
    const flagUrl  = getFlagUrl(row.team, '20x15');
    const flagImg  = flagUrl
      ? `<img src="${flagUrl}" width="20" height="15" alt="${escHtml(row.team)}" loading="lazy">`
      : '';

    return `
      <tr class="gt-row ${posClass}">
        <td class="gt-team">${flagImg}<span class="gt-name">${escHtml(row.team)}</span>${ownerBadge}</td>
        <td class="gt-num">${row.played}</td>
        <td class="gt-num">${row.won}</td>
        <td class="gt-num">${row.drawn}</td>
        <td class="gt-num">${row.lost}</td>
        <td class="gt-num">${row.gf}</td>
        <td class="gt-num">${row.ga}</td>
        <td class="gt-num">${gdStr}</td>
        <td class="gt-pts">${row.pts}</td>
      </tr>`;
  }).join('');

  return `
    <div class="group-block">
      <div class="group-block-title">${group}</div>
      <div class="group-table-wrap">
        <table class="group-table">
          <thead>
            <tr>
              <th class="gt-team-h">Team</th>
              <th class="gt-num" title="Played">P</th>
              <th class="gt-num" title="Won">W</th>
              <th class="gt-num" title="Drawn">D</th>
              <th class="gt-num" title="Lost">L</th>
              <th class="gt-num" title="Goals For">GF</th>
              <th class="gt-num" title="Goals Against">GA</th>
              <th class="gt-num" title="Goal Difference">GD</th>
              <th class="gt-pts" title="Points">Pts</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

// ── Wiring ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const vEl = document.getElementById('version-display');
  if (vEl) vEl.textContent = VERSION;

  populateNavUser();
  document.getElementById('refresh-btn').addEventListener('click', () => loadData(true));
  loadData(false);
});

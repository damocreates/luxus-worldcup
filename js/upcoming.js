// ── Upcoming Fixtures page ────────────────────────────────────────────────────

let upState = {
  matches:    [],
  standings:  {},
  byNum:      {},
  cacheTs:    0,
  timeFilter: 'next24', // 'next24' | 'today' | 'tomorrow' | 'all'
  sweepOnly:  false,
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

// ── Time helpers ──────────────────────────────────────────────────────────────

// Parse "13:00 UTC-6" + "2026-06-11" → UTC Date
function matchUtcTs(date, timeStr) {
  if (!date || !timeStr) return null;
  const m = timeStr.match(/(\d+):(\d+)\s+UTC([+-]?\d+)/);
  if (!m) return null;
  const h      = parseInt(m[1], 10);
  const min    = parseInt(m[2], 10);
  const offset = parseInt(m[3], 10);
  let utcH     = h - offset;
  utcH = ((utcH % 24) + 24) % 24;
  return new Date(`${date}T${String(utcH).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`);
}

// Return YYYY-MM-DD date string in BST (UTC+1), shifted by offsetDays
function getBSTDate(offsetDays) {
  return new Date(Date.now() + 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);
}

// Return the BST calendar date (YYYY-MM-DD) that a match kicks off on
function getMatchBSTDate(match) {
  const ts = matchUtcTs(match.date, match.time);
  if (!ts) return match.date || '';
  return new Date(ts.getTime() + 3600000).toISOString().slice(0, 10);
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadData() {
  setStatus('loading', 'Loading…');
  hideError();
  renderSkeleton();

  const cached  = getCachedData();
  let matches   = cached ? cached.matches : null;
  let fromCache = !!cached;
  if (cached) upState.cacheTs = cached.timestamp;

  try {
    matches   = await fetchWorldCupData();
    fromCache = false;
  } catch (_err) {
    if (!matches) {
      setStatus('error', 'Failed to load data');
      showError('Could not fetch live data and no cached data is available. Please check your connection and try again.');
      return;
    }
    const ts = upState.cacheTs
      ? new Date(upState.cacheTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '';
    setStatus('cached', `Cached data${ts ? ' · Updated ' + ts : ''}`);
    showError('Live data fetch failed — showing last cached data.');
  }

  upState.matches   = matches;
  upState.standings = computeStandings(matches);
  upState.byNum     = buildMatchIndex(matches);

  if (!fromCache) {
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setStatus('live', `Live data · Updated ${ts}`);
  }

  render();
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function renderSkeleton() {
  const list = document.getElementById('uf-list');
  if (!list) return;
  list.innerHTML = Array.from({ length: 5 }, () => `
    <div class="uf-card">
      <div class="uf-hdr">
        <div class="skel-line" style="width:155px;height:10px;margin:0"></div>
        <div class="skel-line" style="width:110px;height:10px;margin:0"></div>
      </div>
      <div class="uf-teams">
        <div class="uf-team" style="gap:.5rem">
          <div class="skel-line" style="width:32px;height:24px;margin:0;flex-shrink:0"></div>
          <div class="skel-line" style="width:55%;height:12px;margin:0"></div>
        </div>
        <div class="uf-divider"><div class="skel-line" style="width:24px;height:9px;margin:0"></div></div>
        <div class="uf-team" style="gap:.5rem">
          <div class="skel-line" style="width:32px;height:24px;margin:0;flex-shrink:0"></div>
          <div class="skel-line" style="width:45%;height:12px;margin:0"></div>
        </div>
      </div>
    </div>`).join('');
}

// ── Filter logic ──────────────────────────────────────────────────────────────

function resolveMatch(m) {
  const t1 = m.group
    ? normalizeTeamName(m.team1)
    : resolveTeam(m.team1, upState.standings, upState.byNum);
  const t2 = m.group
    ? normalizeTeamName(m.team2)
    : resolveTeam(m.team2, upState.standings, upState.byNum);
  return { ...m, rt1: t1, rt2: t2 };
}

function sortByKickoff(arr) {
  return [...arr].sort((a, b) => {
    const ta = matchUtcTs(a.date, a.time);
    const tb = matchUtcTs(b.date, b.time);
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return ta - tb;
  });
}

function getFilteredMatches() {
  const { matches, timeFilter, sweepOnly } = upState;
  const now      = Date.now();
  const resolved = matches.map(resolveMatch);

  let filtered;
  let notice = null;

  if (timeFilter === 'next24') {
    const in24 = now + 86400000;
    filtered = resolved.filter(m => {
      const ts = matchUtcTs(m.date, m.time);
      return ts && ts.getTime() >= now && ts.getTime() <= in24;
    });

    if (!filtered.length) {
      // Fallback 1: next 5 upcoming
      const upcoming = sortByKickoff(
        resolved.filter(m => {
          const ts = matchUtcTs(m.date, m.time);
          return ts && ts.getTime() > now;
        })
      );
      if (upcoming.length) {
        filtered = upcoming.slice(0, 5);
        notice = 'No fixtures in the next 24 hours — showing the next upcoming fixtures.';
      } else {
        // Fallback 2: 5 most recently played
        filtered = resolved
          .filter(m => m.score && m.score.ft)
          .sort((a, b) => {
            const ta = matchUtcTs(a.date, a.time);
            const tb = matchUtcTs(b.date, b.time);
            return (tb ? tb.getTime() : 0) - (ta ? ta.getTime() : 0);
          })
          .slice(0, 5);
        if (filtered.length) notice = 'Tournament over — showing the most recently played matches.';
      }
    }

    filtered = sortByKickoff(filtered);

  } else if (timeFilter === 'today') {
    const todayStr = getBSTDate(0);
    filtered = sortByKickoff(resolved.filter(m => getMatchBSTDate(m) === todayStr));

  } else if (timeFilter === 'tomorrow') {
    const tmrStr = getBSTDate(1);
    filtered = sortByKickoff(resolved.filter(m => getMatchBSTDate(m) === tmrStr));

  } else { // 'all'
    filtered = sortByKickoff(
      resolved.filter(m => {
        const ts = matchUtcTs(m.date, m.time);
        return ts && ts.getTime() > now;
      })
    );
  }

  if (sweepOnly) {
    filtered = filtered.filter(m => TEAM_OWNER[m.rt1] || TEAM_OWNER[m.rt2]);
  }

  return { matches: filtered, notice };
}

// ── Card rendering ────────────────────────────────────────────────────────────

function renderOwnerBadge(owner) {
  if (!owner) return '';
  const color = PERSON_COLORS[owner] || '#888';
  return `<span class="uf-owner" style="background:${color}22;color:${color};border-color:${color}44">${escHtml(owner)}</span>`;
}

function renderResultBadge(result) {
  if (!result) return '';
  return `<span class="badge badge-${result}">${result.toUpperCase()}</span>`;
}

function renderCard(match) {
  const { rt1, rt2 } = match;
  const owner1   = TEAM_OWNER[rt1];
  const owner2   = TEAM_OWNER[rt2];
  const hasSweep = !!(owner1 || owner2);

  const f1url = getFlagUrl(rt1, '32x24');
  const f2url = getFlagUrl(rt2, '32x24');
  const flag1 = f1url
    ? `<img src="${escHtml(f1url)}" width="32" height="24" alt="${escHtml(rt1)}" loading="lazy" style="flex-shrink:0">`
    : `<span style="width:32px;flex-shrink:0;display:inline-block"></span>`;
  const flag2 = f2url
    ? `<img src="${escHtml(f2url)}" width="32" height="24" alt="${escHtml(rt2)}" loading="lazy" style="flex-shrink:0">`
    : `<span style="width:32px;flex-shrink:0;display:inline-block"></span>`;

  const bstTime = timeToBST(match.time);
  const dateStr = formatDate(match.date);
  const venue   = match.ground ? escHtml(match.ground) : '';

  const played = !!(match.score && match.score.ft);
  let score1 = '', score2 = '';
  let result1 = null, result2 = null;

  if (played) {
    [score1, score2] = match.score.ft;
    result1 = getMatchResult(match, true);
    result2 = getMatchResult(match, false);
  }

  const ftBadge = played ? '<span class="uf-ft">FT</span>' : '';

  return `
    <div class="uf-card${hasSweep ? ' uf-sweep' : ''}">
      <div class="uf-hdr">
        <span class="uf-when">${escHtml(dateStr)}${bstTime ? ' · ' + bstTime + ' BST' : ''}</span>
        ${venue ? `<span class="uf-venue">${venue}</span>` : ''}
      </div>
      <div class="uf-teams">
        <div class="uf-team">
          ${flag1}
          <span class="uf-team-name">${escHtml(rt1)}</span>
          ${renderOwnerBadge(owner1)}
          ${hasSweep && played && owner1 ? renderResultBadge(result1) : ''}
          ${played ? `<span class="uf-score">${score1}</span>` : ''}
        </div>
        <div class="uf-divider">
          <span class="uf-vs">vs</span>
          ${ftBadge}
        </div>
        <div class="uf-team">
          ${flag2}
          <span class="uf-team-name">${escHtml(rt2)}</span>
          ${renderOwnerBadge(owner2)}
          ${hasSweep && played && owner2 ? renderResultBadge(result2) : ''}
          ${played ? `<span class="uf-score">${score2}</span>` : ''}
        </div>
      </div>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const list = document.getElementById('uf-list');
  if (!list) return;

  const { matches, notice } = getFilteredMatches();

  const noticeEl = document.getElementById('uf-notice');
  if (noticeEl) {
    if (notice) {
      noticeEl.textContent = notice;
      noticeEl.classList.remove('hidden');
    } else {
      noticeEl.classList.add('hidden');
    }
  }

  if (!matches.length) {
    list.innerHTML = '<div class="empty-state">No fixtures found for this filter.</div>';
    return;
  }

  list.innerHTML = matches.map(renderCard).join('');
}

// ── Wiring ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const vEl = document.getElementById('version-display');
  if (vEl) vEl.textContent = VERSION;

  populateNavUser();

  document.getElementById('refresh-btn').addEventListener('click', () => loadData());

  // Time filter buttons
  document.querySelectorAll('[data-time]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-time]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      upState.timeFilter = btn.dataset.time;
      render();
    });
  });

  // Sweepstake only toggle
  const sweepBtn = document.getElementById('sweep-toggle');
  if (sweepBtn) {
    sweepBtn.addEventListener('click', () => {
      upState.sweepOnly = !upState.sweepOnly;
      sweepBtn.classList.toggle('active', upState.sweepOnly);
      render();
    });
  }

  loadData();
});

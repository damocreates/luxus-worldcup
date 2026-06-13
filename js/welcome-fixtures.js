// ── Upcoming fixtures banner (welcome page) ────────────────────────────────────
(function () {
  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function matchUtcTs(date, timeStr) {
    if (!date || !timeStr) return null;
    const m = timeStr.match(/(\d+):(\d+)\s+UTC([+-]?\d+)/);
    if (!m) return null;
    const h      = parseInt(m[1], 10);
    const min    = parseInt(m[2], 10);
    const offset = parseInt(m[3], 10);
    const utcH   = h - offset;
    return new Date(`${date}T${String(utcH).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`);
  }

  function renderFixtureCard(match) {
    const t1 = match.resolvedTeam1 || normalizeTeamName(match.team1);
    const t2 = match.resolvedTeam2 || normalizeTeamName(match.team2);

    const f1 = getFlagUrl(t1, '32x24');
    const f2 = getFlagUrl(t2, '32x24');
    const flagImg1 = f1 ? `<img src="${f1}" width="32" height="24" alt="${escHtml(t1)}" loading="lazy">` : '';
    const flagImg2 = f2 ? `<img src="${f2}" width="32" height="24" alt="${escHtml(t2)}" loading="lazy">` : '';

    const owner1  = TEAM_OWNER[t1];
    const owner2  = TEAM_OWNER[t2];
    const color1  = owner1 ? PERSON_COLORS[owner1] : null;
    const color2  = owner2 ? PERSON_COLORS[owner2] : null;
    const hasSweep = !!(owner1 || owner2);

    function badge(owner, color) {
      if (!owner) return '';
      return `<span class="wf-badge" style="background:${color}22;color:${color};border-color:${color}44">${escHtml(owner)}</span>`;
    }

    const bstTime = timeToBST(match.time);
    const dateStr = formatDate(match.date);

    return `
      <div class="wf-card${hasSweep ? ' wf-sweep' : ''}">
        <div class="wf-when">${dateStr}${bstTime ? ' · ' + bstTime + ' BST' : ''}</div>
        <div class="wf-team">
          ${flagImg1}
          <span class="wf-team-name">${escHtml(t1)}</span>
          ${badge(owner1, color1)}
        </div>
        <div class="wf-vs">vs</div>
        <div class="wf-team">
          ${flagImg2}
          <span class="wf-team-name">${escHtml(t2)}</span>
          ${badge(owner2, color2)}
        </div>
      </div>`;
  }

  async function loadFixtures() {
    const container = document.getElementById('fixtures-scroll');
    if (!container) return;

    let matches;
    try {
      matches = await fetchWorldCupData();
    } catch (_) {
      const cached = getCachedData();
      matches = cached ? cached.matches : null;
    }

    if (!matches) {
      container.innerHTML = '<div class="wf-empty">Could not load fixtures.</div>';
      return;
    }

    const now  = new Date();
    const in24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const future = matches
      .filter(m => { const ts = matchUtcTs(m.date, m.time); return ts && ts > now; })
      .sort((a, b) => matchUtcTs(a.date, a.time) - matchUtcTs(b.date, b.time));

    const window24 = future.filter(m => matchUtcTs(m.date, m.time) <= in24);
    const shown    = window24.length ? window24 : future.slice(0, 3);

    if (!shown.length) {
      document.getElementById('upcoming-fixtures').style.display = 'none';
      return;
    }

    container.innerHTML = shown.map(renderFixtureCard).join('');
  }

  document.addEventListener('DOMContentLoaded', loadFixtures);
})();

// ── User settings panel ────────────────────────────────────────────────────────
(function () {
  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getWatching() {
    try { return JSON.parse(localStorage.getItem(WATCHING_KEY) || '[]'); } catch { return []; }
  }

  function setWatching(list) {
    localStorage.setItem(WATCHING_KEY, JSON.stringify(list));
  }

  function allTeams() {
    return Object.values(SWEEPSTAKE).flat().sort();
  }

  function renderTeamRows(query) {
    const watching = getWatching();
    const q = (query || '').toLowerCase().trim();
    const teams = q ? allTeams().filter(t => t.toLowerCase().includes(q)) : allTeams();

    if (!teams.length) return '<div class="st-empty">No teams match your search.</div>';

    return teams.map(team => {
      const on      = watching.includes(team);
      const flagUrl = getFlagUrl(team, '20x15');
      const flagImg = flagUrl ? `<img src="${flagUrl}" width="20" height="15" alt="">` : '';
      const owner   = TEAM_OWNER[team] || '';
      const color   = owner ? PERSON_COLORS[owner] : '#6b82a0';
      const badge   = owner
        ? `<span class="st-owner-badge" style="color:${color};border-color:${color}40;background:${color}18">${escHtml(owner)}</span>`
        : '';
      return `
        <label class="st-team-row${on ? ' st-on' : ''}">
          <span class="st-flag">${flagImg}</span>
          <span class="st-team-name">${escHtml(team)}</span>
          ${badge}
          <input type="checkbox" class="st-check" value="${escHtml(team)}"${on ? ' checked' : ''}>
        </label>`;
    }).join('');
  }

  function wireCheckboxes() {
    document.querySelectorAll('#settings-team-list .st-check').forEach(cb => {
      cb.addEventListener('change', function () {
        const team    = this.value;
        const watching = getWatching();
        const row     = this.closest('.st-team-row');
        if (this.checked) {
          if (!watching.includes(team)) watching.push(team);
          row.classList.add('st-on');
        } else {
          const idx = watching.indexOf(team);
          if (idx > -1) watching.splice(idx, 1);
          row.classList.remove('st-on');
        }
        setWatching(watching);
      });
    });
  }

  function openPanel() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;
    // Refresh team list each open (watching state may have changed)
    const listEl = document.getElementById('settings-team-list');
    const searchEl = document.getElementById('settings-search');
    if (listEl) { listEl.innerHTML = renderTeamRows(searchEl ? searchEl.value : ''); wireCheckboxes(); }
    panel.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePanel() {
    const panel = document.getElementById('settings-panel');
    if (panel) panel.classList.remove('open');
    document.body.style.overflow = '';
  }

  function init() {
    const name = localStorage.getItem(AUTH_KEY) || '';

    const panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.className = 'settings-panel';
    panel.innerHTML = `
      <div class="settings-backdrop" id="settings-backdrop"></div>
      <aside class="settings-drawer" id="settings-drawer" role="dialog" aria-label="Settings">
        <div class="settings-hdr">
          <span class="settings-name">${escHtml(name)}</span>
          <button class="settings-close" id="settings-close" aria-label="Close">✕</button>
        </div>
        <div class="settings-section-label">Teams I'm also watching</div>
        <input type="search" class="settings-search" id="settings-search" placeholder="Search teams…" autocomplete="off" spellcheck="false">
        <div class="settings-team-list" id="settings-team-list">${renderTeamRows('')}</div>
        <div class="settings-footer">
          <button class="settings-signout" id="settings-signout">Sign out</button>
        </div>
      </aside>`;
    document.body.appendChild(panel);

    document.getElementById('settings-backdrop').addEventListener('click', closePanel);
    document.getElementById('settings-close').addEventListener('click', closePanel);
    document.getElementById('settings-signout').addEventListener('click', function () {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(WATCHING_KEY);
      location.replace('welcome.html');
    });

    const searchEl = document.getElementById('settings-search');
    const listEl   = document.getElementById('settings-team-list');
    searchEl.addEventListener('input', function () {
      listEl.innerHTML = renderTeamRows(searchEl.value);
      wireCheckboxes();
    });

    wireCheckboxes();
  }

  document.addEventListener('DOMContentLoaded', init);
  window.openSettings = openPanel;
})();

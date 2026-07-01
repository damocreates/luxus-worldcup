// ── Knockout Bracket page ─────────────────────────────────────────────────────

const UNIT     = 175;           // height (px) of one R32 slot
const TOTAL_PX = UNIT * 8;     // 1400 px — total column height

// ── Pan / zoom state ──────────────────────────────────────────────────────────

const SCALE_MIN = 0.3;
const SCALE_MAX = 1.5;

let pan       = { scale: 1, tx: 0, ty: 0 };
let hasCentred = false;

function applyTransform() {
  const el = document.getElementById('bracket-inner');
  if (el) el.style.transform = `translate(${pan.tx}px,${pan.ty}px) scale(${pan.scale})`;
}

function autoCenter() {
  const vp = document.getElementById('bracket-viewport');
  const el = document.getElementById('bracket-inner');
  if (!vp || !el) return;
  const vw = vp.clientWidth, vh = vp.clientHeight;
  const iw = el.scrollWidth,  ih = el.scrollHeight;
  const s  = Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.min(vw / iw * 0.95, 1)));
  pan.scale = s;
  pan.tx    = (vw - iw * s) / 2;
  pan.ty    = Math.max(0, (vh - ih * s) / 2);
  applyTransform();
}

function initDragPan() {
  const vp = document.getElementById('bracket-viewport');
  if (!vp) return;

  let dragging = false, sx = 0, sy = 0, stx = 0, sty = 0;

  vp.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragging = true; sx = e.clientX; sy = e.clientY; stx = pan.tx; sty = pan.ty;
    vp.classList.add('panning');
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    pan.tx = stx + (e.clientX - sx);
    pan.ty = sty + (e.clientY - sy);
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    if (dragging) { dragging = false; vp.classList.remove('panning'); }
  });

  vp.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = vp.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const ns   = Math.max(SCALE_MIN, Math.min(SCALE_MAX, pan.scale * (e.deltaY < 0 ? 1.1 : 0.909)));
    pan.tx     = mx - (mx - pan.tx) * (ns / pan.scale);
    pan.ty     = my - (my - pan.ty) * (ns / pan.scale);
    pan.scale  = ns;
    applyTransform();
  }, { passive: false });

  let lastDist = 0;

  vp.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      dragging = true;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      stx = pan.tx; sty = pan.ty;
    } else if (e.touches.length === 2) {
      dragging = false;
      lastDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: false });

  vp.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && dragging) {
      pan.tx = stx + (e.touches[0].clientX - sx);
      pan.ty = sty + (e.touches[0].clientY - sy);
      applyTransform();
    } else if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastDist > 0) {
        const rect = vp.getBoundingClientRect();
        const mx   = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const my   = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const ns   = Math.max(SCALE_MIN, Math.min(SCALE_MAX, pan.scale * d / lastDist));
        pan.tx     = mx - (mx - pan.tx) * (ns / pan.scale);
        pan.ty     = my - (my - pan.ty) * (ns / pan.scale);
        pan.scale  = ns;
        applyTransform();
      }
      lastDist = d;
    }
  }, { passive: false });

  vp.addEventListener('touchend', e => {
    if (e.touches.length === 0) dragging = false;
    lastDist = 0;
  });
}

// ── Bracket state ─────────────────────────────────────────────────────────────

let bracketState = {
  matches:       [],
  standings:     {},
  byNum:         {},
  groupComplete: {},
};

// ── Status (reused from app.js pattern) ──────────────────────────────────────

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

async function loadData(refresh = false) {
  setStatus('loading', 'Loading…');
  hideError();

  const cached  = getCachedData();
  let matches   = cached ? cached.matches : null;
  let fromCache = !!cached;

  try {
    matches = await fetchWorldCupData();
    fromCache = false;
  } catch (err) {
    if (!matches) {
      setStatus('error', 'Failed to load data');
      showError('Could not fetch live data and no cached data is available.');
      return;
    }
    setStatus('cached', 'Cached data');
    showError('Live data fetch failed — showing last cached data.');
  }

  bracketState.matches       = matches;
  bracketState.standings     = computeStandings(matches);
  bracketState.byNum         = buildMatchIndex(matches);
  bracketState.groupComplete = computeGroupComplete(matches);

  if (!fromCache) {
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setStatus('live', `Live data · Updated ${ts}`);
  }

  renderBracketPage();
}

// ── Bracket tree builder ──────────────────────────────────────────────────────

function isCode(str) {
  return /^\d[A-L]$/i.test(str) ||
         /^\d[A-L](\/[A-L])+$/i.test(str) ||  // "3A/B/C/D/F"
         /^[WL]\d+$/i.test(str);
}

function isSlotResolved(code, standings, byNum, groupComplete) {
  if (!code || !isCode(code)) return true;
  return resolveTeam(code, standings, byNum, groupComplete) !== code;
}

// Fixed WC 2026 bracket tree: each match number maps to the two match numbers
// that feed it (verified against live openfootball data, match 73–104).
// Using a tree avoids parsing team1/team2 code strings — the live data source
// replaces "W73" with the real team name as soon as that slot is confirmed,
// which broke the old string-based trace.
const KNOCKOUT_TREE = {
   89: [74, 77],  90: [73, 75],  91: [76, 78],  92: [79, 80],
   93: [83, 84],  94: [81, 82],  95: [86, 88],  96: [85, 87],
   97: [89, 90],  98: [93, 94],  99: [91, 92], 100: [95, 96],
  101: [97, 98], 102: [99, 100],
  103: [101, 102], // third place (losers of both semis)
  104: [101, 102], // final
};

function splitBracket(matches, standings, byNum) {
  function buildHalf(sfNum) {
    const [qf1, qf2] = KNOCKOUT_TREE[sfNum] || [];
    const r16Nums    = [...(KNOCKOUT_TREE[qf1] || []), ...(KNOCKOUT_TREE[qf2] || [])];
    const r32Nums    = r16Nums.flatMap(n => KNOCKOUT_TREE[n] || []);
    return {
      sf:  byNum[sfNum] || null,
      qf:  [qf1, qf2].map(n => byNum[n]).filter(Boolean),
      r16: r16Nums.map(n => byNum[n]).filter(Boolean),
      r32: r32Nums.map(n => byNum[n]).filter(Boolean),
    };
  }

  return {
    final: byNum[104] || null,
    third: byNum[103] || null,
    left:  buildHalf(101),
    right: buildHalf(102),
  };
}

// ── Match card HTML ───────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderMatchCard(match, isFinal) {
  if (!match) return '';
  const { standings, byNum, groupComplete } = bracketState;

  const num    = match.num ? `Match ${match.num}` : match.round;
  const { date: bstDate, time: bstTime } = matchToBST(match.date, match.time);
  const date   = formatDate(bstDate);
  const bst    = bstTime;
  const venue  = escHtml(match.ground || '');

  const code1  = match.team1 || '';
  const code2  = match.team2 || '';
  const team1  = resolveTeam(code1, standings, byNum, groupComplete);
  const team2  = resolveTeam(code2, standings, byNum, groupComplete);
  const res1   = !isCode(code1) || isSlotResolved(code1, standings, byNum, groupComplete);
  const res2   = !isCode(code2) || isSlotResolved(code2, standings, byNum, groupComplete);

  const hasScore = match.score && match.score.ft;
  const [s1, s2] = hasScore ? match.score.ft : [null, null];
  const winner   = hasScore ? (s1 > s2 ? 1 : s2 > s1 ? 2 : 0) : 0;

  function teamRow(teamName, resolved, side, score, isWinner) {
    const flagUrl  = resolved ? getFlagUrl(teamName, '20x15') : '';
    const flagImg  = flagUrl ? `<img src="${flagUrl}" width="20" height="15" alt="${escHtml(teamName)}" loading="lazy">` : '<span style="width:20px;display:inline-block"></span>';
    const owner    = TEAM_OWNER[teamName];
    const ownerColor = owner ? PERSON_COLORS[owner] : null;
    const ownerDot = ownerColor ? `<span class="bm-owner" style="background:${ownerColor}" title="${escHtml(owner)}"></span>` : '';
    const dispName = resolved ? escHtml(teamName) : `<span style="color:var(--muted)">${escHtml(teamName)}</span>`;
    const scoreHtml = hasScore ? `<span class="bm-score">${score}</span>` : '';
    const rowClass = hasScore ? (isWinner ? 'bm-team winner' : 'bm-team loser') : 'bm-team';

    return `<div class="${rowClass}">${flagImg}<span class="bm-team-name">${dispName}</span>${ownerDot}${scoreHtml}</div>`;
  }

  function potentialFlags() {
    const t1 = res1 ? [] : getPotentialTeams(code1, standings, byNum, groupComplete);
    const t2 = res2 ? [] : getPotentialTeams(code2, standings, byNum, groupComplete);
    const all = [...new Set([...t1, ...t2])];
    if (!all.length) return '';
    const MAX = 8;
    const shown = all.length > MAX ? all.slice(0, MAX - 1) : all;
    const extra = all.length - shown.length;
    const imgs = shown.map(t => {
      const url = getFlagUrl(t, '20x15');
      return url ? `<img src="${url}" width="20" height="15" class="bm-potential-flag" title="${escHtml(t)}" loading="lazy">` : '';
    }).filter(Boolean).join('');
    const moreLabel = extra > 0 ? `<span class="bm-potentials-more">+${extra} more</span>` : '';
    return imgs ? `<div class="bm-potentials">${imgs}${moreLabel}</div>` : '';
  }

  const potentials = potentialFlags();

  return `
    <div class="bm-card${isFinal ? ' bm-final' : ''}">
      <div class="bm-header">
        <span class="bm-num">${escHtml(num)}</span>
        <span class="bm-meta">${date}${bst ? ' · ' + bst + ' BST' : ''}</span>
        <span class="bm-venue" title="${venue}">${venue}</span>
      </div>
      <div class="bm-teams">
        ${teamRow(team1, res1, 'left',  s1, winner === 1)}
        ${teamRow(team2, res2, 'right', s2, winner === 2)}
      </div>
      ${potentials}
    </div>`;
}

// ── Bracket renderer ──────────────────────────────────────────────────────────

function renderBracketPage() {
  const { matches, standings, byNum } = bracketState;
  const bracket = splitBracket(matches, standings, byNum);

  const cols = {
    'left-r32':  { matches: bracket.left.r32,               n: 8 },
    'left-r16':  { matches: bracket.left.r16,               n: 4 },
    'left-qf':   { matches: bracket.left.qf,                n: 2 },
    'left-sf':   { matches: bracket.left.sf ? [bracket.left.sf] : [],  n: 1 },
    'right-sf':  { matches: bracket.right.sf ? [bracket.right.sf] : [], n: 1 },
    'right-qf':  { matches: bracket.right.qf,               n: 2 },
    'right-r16': { matches: bracket.right.r16,              n: 4 },
    'right-r32': { matches: bracket.right.r32,              n: 8 },
  };

  for (const [id, { matches: ms, n }] of Object.entries(cols)) {
    const col = document.getElementById(id);
    if (!col) continue;
    const slotH = TOTAL_PX / n;
    col.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const m = ms[i] || null;
      const slot = document.createElement('div');
      slot.className = 'bracket-slot';
      slot.style.height = `${slotH}px`;
      slot.innerHTML = m ? renderMatchCard(m) : renderEmptySlot();
      col.appendChild(slot);
    }
  }

  // Centre: Final + 3rd place
  const center = document.getElementById('bracket-center');
  if (center) {
    center.innerHTML = `
      <div style="flex:1"></div>
      <div>${bracket.final  ? renderMatchCard(bracket.final, true) : renderEmptySlot()}</div>
      <div style="margin-top:10px;padding-top:6px;border-top:1px solid var(--border)">
        <div style="font-size:.68rem;font-weight:700;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;text-align:center;margin-bottom:4px">3rd Place</div>
        ${bracket.third ? renderMatchCard(bracket.third) : renderEmptySlot()}
      </div>
      <div style="flex:1"></div>`;
  }

  renderOwnerLegend();

  // Draw connector lines, then auto-centre on first load
  requestAnimationFrame(() => requestAnimationFrame(() => {
    drawLines();
    if (!hasCentred) { autoCenter(); hasCentred = true; }
  }));
}

function renderEmptySlot() {
  return `<div class="bm-card" style="min-height:70px;opacity:.35">
    <div class="bm-teams">
      <div class="bm-team"><span class="bm-team-name" style="color:var(--muted)">TBD</span></div>
      <div class="bm-team"><span class="bm-team-name" style="color:var(--muted)">TBD</span></div>
    </div>
  </div>`;
}

// ── Canvas connector lines ────────────────────────────────────────────────────

function drawLines() {
  const canvas = document.getElementById('bracket-canvas');
  const wrap   = document.getElementById('bracket-wrap');
  if (!canvas || !wrap) return;

  const W = wrap.scrollWidth;
  const H = wrap.scrollHeight;
  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#263d5e';
  ctx.lineWidth   = 1.5;

  // Positions from getBoundingClientRect are in screen (scaled) space;
  // divide by pan.scale to convert back to canvas local coordinates.
  const s        = pan.scale;
  const wrapRect = wrap.getBoundingClientRect();

  function cardPos(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      cy: (r.top  + r.height / 2 - wrapRect.top)  / s,
      lx: (r.left - wrapRect.left)                 / s,
      rx: (r.right - wrapRect.left)                / s,
    };
  }

  // Draw connector: two "from" cards → one "to" card, on left or right side
  function drawPair(fromA, fromB, to, isLeft) {
    const a  = cardPos(fromA);
    const b  = cardPos(fromB);
    const t  = cardPos(to);
    if (!a || !b || !t) return;

    const ax  = isLeft ? a.rx : a.lx;
    const bx  = isLeft ? b.rx : b.lx;
    const tx  = isLeft ? t.lx : t.rx;
    const midX = (ax + tx) / 2;

    ctx.beginPath();
    ctx.moveTo(ax, a.cy);   ctx.lineTo(midX, a.cy);
    ctx.lineTo(midX, b.cy); ctx.lineTo(bx, b.cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(midX, (a.cy + b.cy) / 2);
    ctx.lineTo(tx, t.cy);
    ctx.stroke();
  }

  // Draw single: one "from" card → one "to" card
  function drawSingle(from, to, isLeft) {
    const f = cardPos(from);
    const t = cardPos(to);
    if (!f || !t) return;
    ctx.beginPath();
    ctx.moveTo(isLeft ? f.rx : f.lx, f.cy);
    ctx.lineTo(isLeft ? t.lx : t.rx, t.cy);
    ctx.stroke();
  }

  const lR32 = [...document.querySelectorAll('#left-r32  .bm-card')];
  const lR16 = [...document.querySelectorAll('#left-r16  .bm-card')];
  const lQF  = [...document.querySelectorAll('#left-qf   .bm-card')];
  const lSF  = [...document.querySelectorAll('#left-sf   .bm-card')];
  const rR32 = [...document.querySelectorAll('#right-r32 .bm-card')];
  const rR16 = [...document.querySelectorAll('#right-r16 .bm-card')];
  const rQF  = [...document.querySelectorAll('#right-qf  .bm-card')];
  const rSF  = [...document.querySelectorAll('#right-sf  .bm-card')];
  const fin  = document.querySelector('#bracket-center .bm-card');

  // LEFT side: R32→R16→QF→SF→Final
  for (let i = 0; i < lR16.length; i++) drawPair(lR32[i*2], lR32[i*2+1], lR16[i], true);
  for (let i = 0; i < lQF.length;  i++) drawPair(lR16[i*2], lR16[i*2+1], lQF[i],  true);
  if (lQF.length >= 2 && lSF[0])        drawPair(lQF[0], lQF[1], lSF[0], true);
  if (lSF[0] && fin)                     drawSingle(lSF[0], fin, true);

  // RIGHT side: R32→R16→QF→SF→Final (mirror)
  for (let i = 0; i < rR16.length; i++) drawPair(rR32[i*2], rR32[i*2+1], rR16[i], false);
  for (let i = 0; i < rQF.length;  i++) drawPair(rR16[i*2], rR16[i*2+1], rQF[i],  false);
  if (rQF.length >= 2 && rSF[0])        drawPair(rQF[0], rQF[1], rSF[0], false);
  if (rSF[0] && fin)                     drawSingle(rSF[0], fin, false);
}

// ── Owner legend ──────────────────────────────────────────────────────────────

function renderOwnerLegend() {
  const el = document.getElementById('owner-legend');
  if (!el) return;
  el.innerHTML = Object.entries(PERSON_COLORS).map(([name, color]) => `
    <span style="display:inline-flex;align-items:center;gap:.35rem;font-size:.75rem;color:var(--text-dim)">
      <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
      ${escHtml(name)}
    </span>`).join('');
}

// ── Wiring ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const vEl = document.getElementById('version-display');
  if (vEl) vEl.textContent = VERSION;

  populateNavUser();

  document.getElementById('refresh-btn').addEventListener('click', () => loadData(true));

  // Preview flags toggle
  const toggleBtn = document.getElementById('toggle-potentials');
  let showPotentials = true;
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      showPotentials = !showPotentials;
      document.getElementById('bracket-wrap').classList.toggle('no-potentials', !showPotentials);
      toggleBtn.textContent = showPotentials ? 'Hide preview flags' : 'Show preview flags';
    });
  }

  initDragPan();

  window.addEventListener('resize', () => {
    requestAnimationFrame(() => requestAnimationFrame(drawLines));
  });

  loadData(false);
});

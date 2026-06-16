// ── Knockout Bracket page ─────────────────────────────────────────────────────

const SLOT_PX   = 175;          // height (px) of one R32 slot
const TOTAL_PX  = SLOT_PX * 8; // 1400 px — total column height

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

function getMatchByCode(code, byNum) {
  const m = String(code || '').match(/^W(\d+)$/i);
  return m ? byNum[parseInt(m[1], 10)] : null;
}

function splitBracket(matches, standings, byNum) {
  const final3rd = matches.find(m => m.round === 'Match for third place');
  const finalM   = matches.find(m => m.round === 'Final');
  const sfAll    = matches.filter(m => m.round === 'Semi-final');
  const qfAll    = matches.filter(m => m.round === 'Quarter-final');
  const r16All   = matches.filter(m => m.round === 'Round of 16');
  const r32All   = matches.filter(m => m.round === 'Round of 32');

  // Helper: given a code, trace back through "Wxx" until we reach an
  // actual match object (not a winner-of-another).
  function traceToMatch(code) {
    return getMatchByCode(code, byNum);
  }

  // Build each half by tracing from the Final outward
  function buildHalf(sfMatch) {
    if (!sfMatch) return { sf: null, qf: [], r16: [], r32: [] };
    const qf1 = traceToMatch(sfMatch.team1);
    const qf2 = traceToMatch(sfMatch.team2);
    const qfs = [qf1, qf2].filter(Boolean);
    const r16s = qfs.flatMap(q => q ? [traceToMatch(q.team1), traceToMatch(q.team2)].filter(Boolean) : []);
    const r32s = r16s.flatMap(r => r ? [traceToMatch(r.team1), traceToMatch(r.team2)].filter(Boolean) : []);
    return { sf: sfMatch, qf: qfs, r16: r16s, r32: r32s };
  }

  // Determine which SF feeds the left/right halves from the Final's team fields
  let leftSF = null, rightSF = null;
  if (finalM) {
    leftSF  = traceToMatch(finalM.team1);
    rightSF = traceToMatch(finalM.team2);
  }

  // Fallback: just split ordered arrays in half
  if (!leftSF && sfAll.length >= 1) leftSF  = sfAll[0];
  if (!rightSF && sfAll.length >= 2) rightSF = sfAll[1];

  let left  = buildHalf(leftSF);
  let right = buildHalf(rightSF);

  // Second fallback if tracing yielded nothing: split flat arrays by halves
  if (!left.r32.length && r32All.length) {
    left  = { sf: sfAll[0] || null, qf: qfAll.slice(0, 2), r16: r16All.slice(0, 4), r32: r32All.slice(0, 8) };
    right = { sf: sfAll[1] || null, qf: qfAll.slice(2, 4), r16: r16All.slice(4, 8), r32: r32All.slice(8, 16) };
  }

  return { final: finalM, third: final3rd, left, right };
}

// ── Match card HTML ───────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderMatchCard(match, isFinal) {
  if (!match) return '';
  const { standings, byNum, groupComplete } = bracketState;

  const num    = match.num ? `Match ${match.num}` : match.round;
  const date   = formatDate(match.date);
  const bst    = timeToBST(match.time);
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

  // Potential flags — both unresolved teams combined into one row, max 8 total
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

  // Draw connector lines after DOM settles
  requestAnimationFrame(() => requestAnimationFrame(drawLines));
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

  const wrapRect = wrap.getBoundingClientRect();

  function cardPos(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      cy: r.top  + r.height / 2 - wrapRect.top,
      lx: r.left - wrapRect.left,
      rx: r.right - wrapRect.left,
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

  // Scroll hint — hide once user scrolls
  const scrollArea = document.querySelector('.bracket-scroll');
  const scrollHint = document.getElementById('scroll-hint');
  if (scrollArea && scrollHint) {
    scrollArea.addEventListener('scroll', function handler() {
      if (scrollArea.scrollLeft > 20) {
        scrollHint.classList.add('hidden');
        scrollArea.removeEventListener('scroll', handler);
      }
    }, { passive: true });
  }

  window.addEventListener('resize', () => {
    requestAnimationFrame(() => requestAnimationFrame(drawLines));
  });

  loadData(false);
});

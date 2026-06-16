// ── API layer ──────────────────────────────────────────────────────────────────
const WC_API_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const CACHE_KEY  = 'wc2026_data';
const CACHE_TS   = 'wc2026_ts';

const KNOCKOUT_ROUNDS = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final', 'Match for third place'];

// ── Time helpers ──────────────────────────────────────────────────────────────

// "13:00 UTC-6"  →  "20:00" (BST = UTC+1)
// Returns only the time string; does NOT adjust the calendar date.
// Use matchToBST() when you need both a correct BST time AND the correct BST date.
function timeToBST(timeStr) {
  if (!timeStr) return '';
  const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d+)?$/);
  if (!m) return timeStr;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const offset = m[3] ? parseInt(m[3], 10) : 0;
  // convert venue local → UTC → BST(UTC+1)
  let bst = h - offset + 1;
  bst = ((bst % 24) + 24) % 24;
  return `${String(bst).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Returns {date: 'YYYY-MM-DD', time: 'HH:MM'} in BST, correctly advancing the
// calendar date when the UTC→BST conversion crosses midnight.
// Example: date="2026-06-15", time="23:30 UTC+0"  →  {date:"2026-06-16", time:"00:30"}
function matchToBST(dateStr, timeStr) {
  if (!dateStr || !timeStr) return { date: dateStr || '', time: timeToBST(timeStr) };
  const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d+)?$/);
  if (!m) return { date: dateStr, time: timeStr };
  const h      = parseInt(m[1], 10);
  const min    = parseInt(m[2], 10);
  const offset = m[3] ? parseInt(m[3], 10) : 0;
  // Build the full UTC instant from the API date + local time - offset, then add 1 h for BST
  const base  = new Date(dateStr + 'T00:00:00Z');
  const bstDt = new Date(base.getTime() + (h * 60 + min - offset * 60 + 60) * 60000);
  return {
    date: bstDt.toISOString().slice(0, 10),
    time: `${String(bstDt.getUTCHours()).padStart(2, '0')}:${String(bstDt.getUTCMinutes()).padStart(2, '0')}`,
  };
}

// "2026-06-11" → "Thu 11 Jun"
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// "2026-06-11" → Date object (noon UTC so no timezone shift)
function parseDate(dateStr) {
  return dateStr ? new Date(dateStr + 'T12:00:00Z') : null;
}

// ── Standings ────────────────────────────────────────────────────────────────

function computeStandings(matches) {
  const groups = {};

  for (const match of matches) {
    if (!match.group) continue;
    const g = match.group;
    if (!groups[g]) groups[g] = {};

    for (const t of [normalizeTeamName(match.team1), normalizeTeamName(match.team2)]) {
      if (t && !groups[g][t]) {
        groups[g][t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
      }
    }

    if (!match.score || !match.score.ft) continue;
    const [s1, s2] = match.score.ft;
    const t1 = groups[g][normalizeTeamName(match.team1)];
    const t2 = groups[g][normalizeTeamName(match.team2)];
    if (!t1 || !t2) continue;

    t1.played++; t1.gf += s1; t1.ga += s2;
    t2.played++; t2.gf += s2; t2.ga += s1;

    if (s1 > s2)      { t1.won++; t1.pts += 3; t2.lost++; }
    else if (s2 > s1) { t2.won++; t2.pts += 3; t1.lost++; }
    else              { t1.drawn++; t1.pts++; t2.drawn++; t2.pts++; }
  }

  const result = {};
  for (const [g, teams] of Object.entries(groups)) {
    result[g] = Object.values(teams).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const gdA = a.gf - a.ga, gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });
  }
  return result;
}

// ── Bracket helpers ──────────────────────────────────────────────────────────

function buildMatchIndex(matches) {
  const idx = {};
  for (const m of matches) {
    if (m.num != null) idx[m.num] = m;
  }
  return idx;
}

// Returns a map of group key → boolean: true only when every match in that group
// has a final score.  Used by the bracket to gate group-position slot resolution.
function computeGroupComplete(matches) {
  const total = {};
  const done  = {};
  for (const m of matches) {
    if (!m.group) continue;
    const g = m.group;
    total[g] = (total[g] || 0) + 1;
    if (m.score && m.score.ft) done[g] = (done[g] || 0) + 1;
  }
  const result = {};
  for (const g of Object.keys(total)) {
    result[g] = total[g] > 0 && total[g] === (done[g] || 0);
  }
  return result;
}

// Resolve a team code ("1A", "2B", "3A/B/C/D/F", "W73") to the canonical team name.
// Returns the resolved name if known, or the original code if not yet determined.
// Pass groupComplete (from computeGroupComplete) to enforce strict group-completion
// gating; omit or pass null to use the old behaviour (resolve from current standings).
function resolveTeam(code, standings, byNum, groupComplete = null, _depth = 0) {
  if (!code || _depth > 10) return code || '';

  // "1A" / "2B" etc. — position N in a specific group
  const posGroup = code.match(/^(\d)([A-L])$/i);
  if (posGroup) {
    const pos  = parseInt(posGroup[1], 10) - 1;
    const gKey = 'Group ' + posGroup[2].toUpperCase();
    // When strict mode is on, only resolve once all group matches are final
    if (groupComplete != null && !groupComplete[gKey]) return code;
    const row  = (standings[gKey] || [])[pos];
    return row ? row.team : code;
  }

  // "3A/B/C/D/F" — best Nth-place team across multiple groups (unresolvable until group stage ends)
  if (/^\d[A-L](\/[A-L])+$/i.test(code)) return code;

  // "W73" (winner of match 73) or "L73" (loser — used by 3rd-place play-off)
  const winnerOf = code.match(/^([WL])(\d+)$/i);
  if (winnerOf) {
    const wantWinner = winnerOf[1].toUpperCase() === 'W';
    const m = byNum[parseInt(winnerOf[2], 10)];
    if (!m) return code;
    if (m.score && m.score.ft) {
      const [s1, s2] = m.score.ft;
      const [e1, e2] = m.score.et || [s1, s2];
      const [p1, p2] = m.score.p  || [0, 0];
      const t1wins   = e1 > e2 || (e1 === e2 && p1 > p2);
      const t1 = resolveTeam(m.team1, standings, byNum, groupComplete, _depth + 1);
      const t2 = resolveTeam(m.team2, standings, byNum, groupComplete, _depth + 1);
      if (wantWinner) return t1wins ? t1 : t2;
      return t1wins ? t2 : t1;
    }
    return code;
  }

  // Already a team name — normalise
  return normalizeTeamName(code);
}

// Return the set of concrete team names that could fill an unresolved slot.
// Accepts the same optional groupComplete map as resolveTeam.
function getPotentialTeams(code, standings, byNum, groupComplete = null, _depth = 0) {
  if (!code || _depth > 6) return [];

  // "1A" — all teams in that group are potential candidates
  const posGroup = code.match(/^(\d)([A-L])$/i);
  if (posGroup) {
    const gKey = 'Group ' + posGroup[2].toUpperCase();
    return (standings[gKey] || []).map(t => t.team);
  }

  // "3A/B/C/D/F" — 3rd-place team from each listed group is a candidate
  const multiGroup = code.match(/^(\d)([A-L](?:\/[A-L])+)$/i);
  if (multiGroup) {
    const pos     = parseInt(multiGroup[1], 10) - 1;
    const letters = multiGroup[2].split('/');
    return letters.flatMap(letter => {
      const gKey = 'Group ' + letter.toUpperCase();
      const row  = (standings[gKey] || [])[pos];
      return row ? [row.team] : [];
    });
  }

  const winnerOf = code.match(/^([WL])(\d+)$/i);
  if (winnerOf) {
    const m = byNum[parseInt(winnerOf[2], 10)];
    if (!m) return [];
    if (m.score && m.score.ft) {
      return [resolveTeam(code, standings, byNum, groupComplete)];
    }
    return [
      ...getPotentialTeams(m.team1, standings, byNum, groupComplete, _depth + 1),
      ...getPotentialTeams(m.team2, standings, byNum, groupComplete, _depth + 1),
    ];
  }

  return [normalizeTeamName(code)];
}

// ── Team match utilities ──────────────────────────────────────────────────────

function getTeamFixtures(teamName, matches, standings, byNum) {
  const byRound = {};

  for (const match of matches) {
    if (match.group) {
      // Group stage
      const t1 = normalizeTeamName(match.team1);
      const t2 = normalizeTeamName(match.team2);
      if (t1 !== teamName && t2 !== teamName) continue;
      const stage = 'Group Stage';
      if (!byRound[stage]) byRound[stage] = [];
      byRound[stage].push({ match, isTeam1: t1 === teamName });

    } else if (KNOCKOUT_ROUNDS.includes(match.round)) {
      const r1 = resolveTeam(match.team1, standings, byNum);
      const r2 = resolveTeam(match.team2, standings, byNum);
      if (r1 !== teamName && r2 !== teamName) continue;
      const stage = match.round;
      if (!byRound[stage]) byRound[stage] = [];
      byRound[stage].push({
        match: { ...match, resolvedTeam1: r1, resolvedTeam2: r2 },
        isTeam1: r1 === teamName,
      });
    }
  }
  return byRound;
}

function getMatchResult(match, isTeam1) {
  if (!match.score || !match.score.ft) return null;
  const [s1, s2] = match.score.ft;
  const myScore  = isTeam1 ? s1 : s2;
  const oppScore = isTeam1 ? s2 : s1;
  if (myScore > oppScore) return 'win';
  if (myScore < oppScore) return 'loss';
  // Knockout draw — need et/pen to determine
  if (match.score.et) {
    const [e1, e2] = match.score.et;
    const em = isTeam1 ? e1 : e2, eo = isTeam1 ? e2 : e1;
    if (em > eo) return 'win';
    if (em < eo) return 'loss';
  }
  if (match.score.p) {
    const [p1, p2] = match.score.p;
    const pm = isTeam1 ? p1 : p2, po = isTeam1 ? p2 : p1;
    if (pm > po) return 'win';
    if (pm < po) return 'loss';
  }
  return 'draw';
}

function matchPoints(result) {
  return result === 'win' ? 3 : result === 'draw' ? 1 : 0;
}

function getTeamPoints(teamName, matches, standings, byNum) {
  let pts = 0;
  for (const match of matches) {
    let isTeam1;
    if (match.group) {
      if (normalizeTeamName(match.team1) === teamName) isTeam1 = true;
      else if (normalizeTeamName(match.team2) === teamName) isTeam1 = false;
      else continue;
    } else if (KNOCKOUT_ROUNDS.includes(match.round)) {
      const r1 = resolveTeam(match.team1, standings, byNum);
      const r2 = resolveTeam(match.team2, standings, byNum);
      if (r1 === teamName) isTeam1 = true;
      else if (r2 === teamName) isTeam1 = false;
      else continue;
    } else continue;

    const result = getMatchResult(match, isTeam1);
    pts += matchPoints(result);
  }
  return pts;
}

function getPersonPoints(person, matches, standings, byNum) {
  const teams = SWEEPSTAKE[person] || [];
  return teams.reduce((sum, t) => sum + getTeamPoints(t, matches, standings, byNum), 0);
}

// ── Groups meta ───────────────────────────────────────────────────────────────

function getGroupNames(standings) {
  return Object.keys(standings).sort((a, b) => {
    const la = a.replace('Group ', ''), lb = b.replace('Group ', '');
    return la.localeCompare(lb);
  });
}

function getTeamGroup(teamName, matches) {
  for (const m of matches) {
    if (!m.group) continue;
    if (normalizeTeamName(m.team1) === teamName || normalizeTeamName(m.team2) === teamName) {
      return m.group;
    }
  }
  return null;
}

// ── Team record & elimination ─────────────────────────────────────────────────

function getTeamRecord(teamName, matches, standings, byNum) {
  let wins = 0, draws = 0, losses = 0;
  for (const match of matches) {
    let isTeam1;
    if (match.group) {
      if (normalizeTeamName(match.team1) === teamName) isTeam1 = true;
      else if (normalizeTeamName(match.team2) === teamName) isTeam1 = false;
      else continue;
    } else if (KNOCKOUT_ROUNDS.includes(match.round)) {
      const r1 = resolveTeam(match.team1, standings, byNum);
      const r2 = resolveTeam(match.team2, standings, byNum);
      if (r1 === teamName) isTeam1 = true;
      else if (r2 === teamName) isTeam1 = false;
      else continue;
    } else continue;
    if (!match.score || !match.score.ft) continue;
    const result = getMatchResult(match, isTeam1);
    if (result === 'win') wins++;
    else if (result === 'draw') draws++;
    else if (result === 'loss') losses++;
  }
  return { wins, draws, losses };
}

function isTeamEliminated(teamName, matches, standings, byNum) {
  for (const match of matches) {
    if (!KNOCKOUT_ROUNDS.includes(match.round)) continue;
    const r1 = resolveTeam(match.team1, standings, byNum);
    const r2 = resolveTeam(match.team2, standings, byNum);
    if (r1 !== teamName && r2 !== teamName) continue;
    if (!match.score || !match.score.ft) continue;
    if (getMatchResult(match, r1 === teamName) === 'loss') return true;
  }
  for (const rows of Object.values(standings)) {
    const idx = rows.findIndex(r => r.team === teamName);
    if (idx < 0) continue;
    if (rows.every(r => r.played >= 3) && idx >= 3) return true;
    break;
  }
  return false;
}

// ── Fetch / cache ─────────────────────────────────────────────────────────────

async function fetchWorldCupData() {
  const url = `${WC_API_URL}?_=${Date.now()}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  const data = json.matches || [];
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TS, Date.now().toString());
  } catch (_) { /* storage full — ignore */ }
  return data;
}

function getCachedData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const ts  = localStorage.getItem(CACHE_TS);
    if (!raw) return null;
    return { matches: JSON.parse(raw), timestamp: ts ? parseInt(ts, 10) : 0 };
  } catch (_) { return null; }
}

// Sweepstake assignments: person → array of team names
const SWEEPSTAKE = {
  'Dan':    ['Cape Verde', 'Ivory Coast', 'DR Congo', 'Germany'],
  'Damo':   ['South Korea', 'Curaçao', 'Sweden', 'Brazil'],
  'Dave O': ['Egypt', 'Senegal', 'Algeria'],
  'Ellie':  ['Saudi Arabia', 'South Africa', 'Croatia'],
  'Erica':  ['Uzbekistan', 'Mexico', 'Tunisia'],
  'Melbin': ['Panama', 'Paraguay'],
  'Gus':    ['Uruguay', 'England', 'Canada'],
  'Anna':   ['Ecuador', 'Bosnia & Herzegovina'],
  'Ben':    ['Iran', 'Spain'],
  'Cam':    ['USA', 'Haiti'],
  'Colin':  ['Ghana', 'Portugal'],
  'Dylan':  ['Austria', 'Czech Republic'],
  'Jax':    ['Jordan', 'Norway'],
  'Lewis':  ['Argentina', 'Colombia'],
  'Lex':    ['Belgium', 'Morocco'],
  'Ryan':   ['New Zealand', 'Australia'],
  'Wilky':  ['Scotland', 'Turkey'],
  'Chris':  ['Switzerland'],
  'Daisy':  ['Iraq'],
  'Dave H': ['Netherlands'],
  'Emre':   ['France'],
  'Gem':    ['Japan'],
  'Kenny':  ['Qatar'],
};

// Sweepstake owner colours (consistent across pages)
const PERSON_COLORS = {
  'Dan':    '#4fc3f7',
  'Damo':   '#f5c842',
  'Dave O': '#4ade80',
  'Ellie':  '#f87171',
  'Erica':  '#c084fc',
  'Melbin': '#fb923c',
  'Gus':    '#34d399',
  'Anna':   '#e879f9',
  'Ben':    '#60a5fa',
  'Cam':    '#facc15',
  'Colin':  '#a78bfa',
  'Dylan':  '#f472b6',
  'Jax':    '#2dd4bf',
  'Lewis':  '#fbbf24',
  'Lex':    '#818cf8',
  'Ryan':   '#86efac',
  'Wilky':  '#fca5a5',
  'Chris':  '#67e8f9',
  'Daisy':  '#d8b4fe',
  'Dave H': '#fdba74',
  'Emre':   '#6ee7b7',
  'Gem':    '#93c5fd',
  'Kenny':  '#fde68a',
};

// API name variants → canonical sweepstake name
const TEAM_ALIASES = {
  "Côte d'Ivoire":           'Ivory Coast',
  'Congo DR':                'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Korea Republic':          'South Korea',
  'Curacao':                 'Curaçao',
  'Bosnia and Herzegovina':  'Bosnia & Herzegovina',
  'Czechia':                 'Czech Republic',
  'Türkiye':                 'Turkey',
  'United States':           'USA',
  'IR Iran':                 'Iran',
  'Cape Verde Islands':      'Cape Verde',
};

// Reverse lookup: team name → person name (built at init)
const TEAM_OWNER = {};
for (const [person, teams] of Object.entries(SWEEPSTAKE)) {
  for (const team of teams) {
    TEAM_OWNER[team] = person;
  }
}

// Normalise a name from the API to the canonical sweepstake name (or return as-is)
function normalizeTeamName(name) {
  if (!name) return name;
  return TEAM_ALIASES[name] || name;
}

// Person initials for avatar
function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

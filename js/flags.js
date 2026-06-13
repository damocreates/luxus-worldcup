// Maps canonical team name → flagcdn.com ISO code
const FLAG_CODES = {
  'Afghanistan': 'af', 'Albania': 'al', 'Algeria': 'dz', 'Angola': 'ao',
  'Argentina': 'ar', 'Armenia': 'am', 'Australia': 'au', 'Austria': 'at',
  'Azerbaijan': 'az', 'Bahrain': 'bh', 'Belgium': 'be', 'Bolivia': 'bo',
  'Bosnia & Herzegovina': 'ba', 'Bosnia and Herzegovina': 'ba',
  'Brazil': 'br', 'Bulgaria': 'bg', 'Burkina Faso': 'bf',
  'Cameroon': 'cm', 'Canada': 'ca', 'Cape Verde': 'cv',
  'Chile': 'cl', 'China': 'cn', 'Colombia': 'co',
  'Congo': 'cg', 'Costa Rica': 'cr', 'Croatia': 'hr',
  'Cuba': 'cu', 'Curaçao': 'cw', 'Curacao': 'cw',
  'Czech Republic': 'cz', 'Czechia': 'cz',
  'Denmark': 'dk', 'DR Congo': 'cd', 'Congo DR': 'cd', 'Democratic Republic of Congo': 'cd',
  'Ecuador': 'ec', 'Egypt': 'eg', 'El Salvador': 'sv', 'England': 'gb-eng',
  'Estonia': 'ee', 'Ethiopia': 'et', 'Finland': 'fi', 'France': 'fr',
  'Gabon': 'ga', 'Georgia': 'ge', 'Germany': 'de', 'Ghana': 'gh',
  'Greece': 'gr', 'Guatemala': 'gt', 'Guinea': 'gn', 'Haiti': 'ht',
  'Honduras': 'hn', 'Hungary': 'hu', 'Iceland': 'is', 'India': 'in',
  'Indonesia': 'id', 'Iran': 'ir', 'Iraq': 'iq', 'Ireland': 'ie',
  'Israel': 'il', 'Italy': 'it', 'Ivory Coast': 'ci', "Côte d'Ivoire": 'ci',
  'Jamaica': 'jm', 'Japan': 'jp', 'Jordan': 'jo', 'Kazakhstan': 'kz',
  'Kenya': 'ke', 'Korea Republic': 'kr', 'South Korea': 'kr',
  'Kuwait': 'kw', 'Libya': 'ly', 'Lithuania': 'lt',
  'Mali': 'ml', 'Mexico': 'mx', 'Morocco': 'ma', 'Mozambique': 'mz',
  'Netherlands': 'nl', 'New Zealand': 'nz', 'Nicaragua': 'ni',
  'Nigeria': 'ng', 'Norway': 'no',
  'Oman': 'om', 'Panama': 'pa', 'Paraguay': 'py', 'Peru': 'pe',
  'Philippines': 'ph', 'Poland': 'pl', 'Portugal': 'pt',
  'Qatar': 'qa', 'Romania': 'ro', 'Russia': 'ru',
  'Saudi Arabia': 'sa', 'Scotland': 'gb-sct', 'Senegal': 'sn',
  'Serbia': 'rs', 'Slovakia': 'sk', 'Slovenia': 'si',
  'South Africa': 'za', 'Spain': 'es', 'Sweden': 'se',
  'Switzerland': 'ch', 'Syria': 'sy',
  'Tanzania': 'tz', 'Thailand': 'th', 'Trinidad and Tobago': 'tt',
  'Tunisia': 'tn', 'Turkey': 'tr', 'Türkiye': 'tr',
  'Uganda': 'ug', 'Ukraine': 'ua', 'United Arab Emirates': 'ae',
  'United States': 'us', 'USA': 'us', 'Uruguay': 'uy',
  'Uzbekistan': 'uz', 'Venezuela': 've', 'Vietnam': 'vn',
  'Wales': 'gb-wls', 'Zambia': 'zm', 'Zimbabwe': 'zw',
};

function getFlagUrl(teamName, size) {
  if (!teamName) return '';
  const code = FLAG_CODES[teamName] || FLAG_CODES[teamName.trim()];
  if (!code) return '';
  return `https://flagcdn.com/${size}/${code}.png`;
}

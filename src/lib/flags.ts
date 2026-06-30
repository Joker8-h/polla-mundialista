const TEAM_FLAGS: Record<string, string> = {
  "argentina": "ar", "australia": "au", "austria": "at", "belgium": "be",
  "brazil": "br", "cabo verde": "cv", "cameroon": "cm", "canada": "ca",
  "chile": "cl", "china": "cn", "colombia": "co", "costa rica": "cr",
  "croatia": "hr", "cuba": "cu", "curacao": "cw", "czech republic": "cz",
  "denmark": "dk", "ecuador": "ec", "egypt": "eg", "england": "gb-eng",
  "france": "fr", "germany": "de", "ghana": "gh", "greece": "gr",
  "guatemala": "gt", "guinea": "gn", "haiti": "ht", "honduras": "hn",
  "hungary": "hu", "iceland": "is", "india": "in", "indonesia": "id",
  "iran": "ir", "iraq": "iq", "ireland": "ie", "israel": "il",
  "italy": "it", "ivory coast": "ci", "cote d'ivoire": "ci", "jamaica": "jm",
  "japan": "jp", "jordan": "jo", "kenya": "ke", "south korea": "kr",
  "lebanon": "lb", "mali": "ml", "mexico": "mx", "morocco": "ma",
  "netherlands": "nl", "new zealand": "nz", "nigeria": "ng", "norway": "no",
  "panama": "pa", "paraguay": "py", "peru": "pe", "poland": "pl",
  "portugal": "pt", "romania": "ro", "russia": "ru", "saudi arabia": "sa",
  "senegal": "sn", "serbia": "rs", "singapore": "sg", "slovakia": "sk",
  "slovenia": "si", "south africa": "za", "spain": "es", "sweden": "se",
  "switzerland": "ch", "tunisia": "tn", "turkey": "tr", "turkiye": "tr",
  "usa": "us", "uruguay": "uy", "uzbekistan": "uz", "wales": "gb-wls",
  "dr congo": "cd",
};

function normalizeTeamName(team: string): string {
  return team
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCountryCode(team: string): string {
  return TEAM_FLAGS[normalizeTeamName(team)] || "zz";
}

export function getFlagUrl(team: string): string {
  const code = getCountryCode(team);
  return `https://flagcdn.com/w80/${code}.png`;
}

export function getFlagEmoji(team: string): string {
  const code = getCountryCode(team);
  if (!code || code === "zz") return "??";
  if (code === "gb-eng") return "ENG";
  if (code === "gb-wls") return "WAL";
  if (code.length !== 2) return code.toUpperCase();

  const base = 127397;
  return String.fromCodePoint(...code.toUpperCase().split("").map((char) => base + char.charCodeAt(0)));
}

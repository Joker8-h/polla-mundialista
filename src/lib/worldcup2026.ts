const API_BASE = "https://worldcup26.ir";

export interface WCMatch {
  _id: string;
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  home_scorers: string;
  away_scorers: string;
  group: string;
  matchday: string;
  local_date: string;
  stadium_id: string;
  finished: string;
  time_elapsed: string;
  type: string;
  home_team_label?: string;
  away_team_label?: string;
  home_team_name_en?: string;
  home_team_name_fa?: string;
  away_team_name_en?: string;
  away_team_name_fa?: string;
}

export interface WCTeam {
  _id: string;
  id: string;
  name_en: string;
  name_fa: string;
  flag: string;
  fifa_code: string;
  iso2: string;
  groups: string;
}

function withTimeout(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

export async function fetchAllWcMatches(): Promise<WCMatch[]> {
  const { signal, cleanup } = withTimeout(15000);
  try {
    const res = await fetch(`${API_BASE}/get/games`, { signal, cache: "no-store" });
    if (!res.ok) throw new Error(`Worldcup2026 API error: ${res.status}`);
    const data = await res.json();
    return data.games || [];
  } finally {
    cleanup();
  }
}

export async function fetchWcTeams(): Promise<WCTeam[]> {
  const { signal, cleanup } = withTimeout(15000);
  try {
    const res = await fetch(`${API_BASE}/get/teams`, { signal, cache: "no-store" });
    if (!res.ok) throw new Error(`Worldcup2026 API error: ${res.status}`);
    const data = await res.json();
    return data.teams || [];
  } finally {
    cleanup();
  }
}

export async function getWcTeamsMap(): Promise<Map<number, WCTeam>> {
  const teams = await fetchWcTeams();
  const map = new Map<number, WCTeam>();
  for (const team of teams) {
    map.set(parseInt(team.id), team);
  }
  return map;
}

/**
 * Parsea la fecha local "DD/MM/YYYY HH:MM" de worldcup2026 a un Date object.
 * La fecha se interpreta como hora local de Colombia (UTC-5).
 */
export function parseLocalDate(localDate: string): Date {
  const [datePart, timePart] = localDate.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day, hours + 5, minutes, 0));
  return date;
}

/**
 * Convierte el estado de worldcup2026 a nuestro formato interno.
 * worldcup2026: "finished", "notstarted", "live", etc.
 */
export function mapWcStatus(wcMatch: WCMatch): string {
  if (wcMatch.finished === "TRUE") return "finished";
  if (wcMatch.time_elapsed === "live" || wcMatch.time_elapsed === "halftime") return "live";
  return "scheduled";
}

/**
 * Convierte un WCMatch de worldcup2026 al formato de nuestro modelo Match en MySQL.
 * Retorna los campos necesarios para prisma.match.create/update.
 */
export function wcMatchToDbFormat(wcMatch: WCMatch) {
  const status = mapWcStatus(wcMatch);
  const matchDate = parseLocalDate(wcMatch.local_date);

  return {
    apiMatchId: parseInt(wcMatch.id),
    homeTeam: wcMatch.home_team_name_en || wcMatch.home_team_label || "TBD",
    awayTeam: wcMatch.away_team_name_en || wcMatch.away_team_label || "TBD",
    homeTeamId: parseInt(wcMatch.home_team_id) || 0,
    awayTeamId: parseInt(wcMatch.away_team_id) || 0,
    matchDate,
    status,
    groupName: wcMatch.group || null,
    roundNumber: parseInt(wcMatch.matchday) || null,
    homeScore: status === "finished" || status === "live" ? parseInt(wcMatch.home_score) || 0 : null,
    awayScore: status === "finished" || status === "live" ? parseInt(wcMatch.away_score) || 0 : null,
  };
}

/**
 * Filtra partidos de worldcup2026 por fecha local (YYYY-MM-DD).
 * Usa la fecha local del partido (no UTC) para evitar partidos faltantes.
 */
export function filterMatchesByLocalDate(matches: WCMatch[], dateStr: string): WCMatch[] {
  return matches.filter((m) => {
    const [day, month, year] = m.local_date.split(" ")[0].split("/");
    const matchDateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return matchDateStr === dateStr;
  });
}

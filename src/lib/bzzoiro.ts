import { todayColombia, toColombiaDate } from "./colombia-time";

const API_KEY = process.env.BZZOIRO_API_KEY || "";
const API_URL = process.env.BZZOIRO_API_URL || "https://sports.bzzoiro.com/api/v2";
const CDN_URL = process.env.BZZOIRO_CDN_URL || "https://sports.bzzoiro.com/img";
if (!API_KEY) console.error("BZZOIRO_API_KEY no configurada");

const headers = { Authorization: `Token ${API_KEY}` };

export function parseEventDate(rawDate: string): Date {
  if (/[Zz]|[+-]\d{2}:\d{2}$/.test(rawDate)) {
    return new Date(rawDate);
  }
  return new Date(rawDate + "-05:00");
}

function eventColDate(event: BzzoiroEvent): string {
  return toColombiaDate(parseEventDate(event.event_date));
}

export interface BzzoiroEvent {
  id: number;
  league_id: number;
  home_team: string;
  away_team: string;
  home_team_id: number;
  away_team_id: number;
  event_date: string;
  status: string;
  group_name: string | null;
  round_number: number;
  home_score: number | null;
  away_score: number | null;
  current_minute?: number | null;
}

export interface PlayerStat {
  player_id: number;
  team_id: number;
  goals: number;
  total_shots: number;
  shots_on_target: number;
  fouls: number;
  yellow_card: number;
  red_card: number;
  saves: number;
  accurate_pass: number;
  total_cross: number;
  was_fouled: number;
}

export interface Incident {
  type: string;
  minute: number;
  player?: string;
  player_id?: number;
  is_home?: boolean;
  card_type?: string;
  goal_type?: string;
}

export interface LineupPlayer {
  id: number;
  name: string;
  short_name: string;
  position: string;
  jersey_number: number;
}

export interface Lineups {
  lineup_status: string;
  lineups: {
    home: { team_id: number; team_name: string; formation: string; players: LineupPlayer[]; substitutes: LineupPlayer[] };
    away: { team_id: number; team_name: string; formation: string; players: LineupPlayer[]; substitutes: LineupPlayer[] };
  };
}

async function safeFetch(url: string, fallback: unknown = []) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return fallback;
    return res.json();
  } catch {
    return fallback;
  }
}

let seasonCache: BzzoiroEvent[] = [];
let seasonCacheTs = 0;
const SEASON_CACHE_TTL = 60_000;
// Note: cache is per-serverless-instance. Helps during warm starts.

export async function fetchAllSeasonMatches(): Promise<BzzoiroEvent[]> {
  const now = Date.now();
  if (seasonCache.length > 0 && now - seasonCacheTs < SEASON_CACHE_TTL) return seasonCache;
  const data = await safeFetch(`${API_URL}/events/?league_id=27&season_id=188&limit=200`) as any;
  seasonCache = data?.results || [];
  seasonCacheTs = now;
  return seasonCache;
}

export async function fetchTodayMatches(): Promise<BzzoiroEvent[]> {
  return fetchMatchesByDate(todayColombia());
}

export async function fetchMatchesByDate(date: string): Promise<BzzoiroEvent[]> {
  const all = await fetchAllSeasonMatches();
  return all.filter(e => eventColDate(e) === date);
}

export async function fetchMatchDetail(eventId: number) {
  return safeFetch(`${API_URL}/events/${eventId}/?full=true`, null);
}

export async function fetchPlayerStats(eventId: number): Promise<PlayerStat[]> {
  const data = await safeFetch(`${API_URL}/events/${eventId}/player-stats/`) as any;
  return data?.player_stats || [];
}

export async function fetchIncidents(eventId: number): Promise<Incident[]> {
  const data = await safeFetch(`${API_URL}/events/${eventId}/incidents/`) as any;
  return data?.incidents || [];
}

export async function fetchLineups(eventId: number): Promise<Lineups | null> {
  const res = await fetch(`${API_URL}/events/${eventId}/lineups/`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export function getTeamAggregateStats(stats: PlayerStat[], teamId: number) {
  const teamStats = stats.filter((s) => s.team_id === teamId);
  return {
    totalShots: teamStats.reduce((sum, s) => sum + (s.total_shots || 0), 0),
    shotsOnGoal: teamStats.reduce((sum, s) => sum + (s.shots_on_target || 0), 0),
    fouls: teamStats.reduce((sum, s) => sum + (s.fouls || 0), 0),
    yellowCards: teamStats.reduce((sum, s) => sum + (s.yellow_card || 0), 0),
    redCards: teamStats.reduce((sum, s) => sum + (s.red_card || 0), 0),
    saves: teamStats.reduce((sum, s) => sum + (s.saves || 0), 0),
    accuratePass: teamStats.reduce((sum, s) => sum + (s.accurate_pass || 0), 0),
    totalCross: teamStats.reduce((sum, s) => sum + (s.total_cross || 0), 0),
  };
}

export function getTotalSubstitutions(incidents: Incident[]): number {
  return incidents.filter((i) => i.type === "substitution").length;
}

export function getGoalScorers(incidents: Incident[]): { player: string; playerId: number; count: number }[] {
  const goals = incidents.filter((i) => i.type === "goal" && i.player_id != null && i.player);
  const scorerMap = new Map<string, { player: string; playerId: number; count: number }>();
  for (const g of goals) {
    const key = `${g.player_id}`;
    if (scorerMap.has(key)) {
      scorerMap.get(key)!.count++;
    } else {
      scorerMap.set(key, { player: g.player!, playerId: g.player_id!, count: 1 });
    }
  }
  return Array.from(scorerMap.values());
}

export function getPlayerImageUrl(playerId: number): string {
  return `${CDN_URL}/player/${playerId}/?bg=transparent`;
}

import { getFlagUrl as getFlagUrlFromFlags, getCountryCode as getCountryCodeFromFlags } from "./flags";

export function getTeamImageUrl(teamId: number): string {
  return `${CDN_URL}/team/${teamId}/?bg=transparent`;
}

export function getFlagUrl(teamName: string): string {
  return getFlagUrlFromFlags(teamName);
}

export function getCountryCode(teamName: string): string {
  return getCountryCodeFromFlags(teamName);
}

let lastSync = 0;
export async function syncLiveMatchesIfNecessary() {
  const now = Date.now();
  if (now - lastSync < 15000) return;
  lastSync = now;
  try {
    const { prisma } = await import("./prisma");
    const all = await fetchAllSeasonMatches();
    const today = todayColombia();
    const yesterday = toColombiaDate(new Date(Date.now() - 86400000));
    const tomorrow = toColombiaDate(new Date(Date.now() + 86400000));
    const relevant = all.filter(e => {
      const d = eventColDate(e);
      return d >= yesterday && d <= tomorrow;
    });
    for (const event of relevant) {
      let status = "scheduled";
      if (event.status === "finished" || event.status === "ended") status = "finished";
      else if (["live", "halftime", "HT", "1H", "2H", "1st_half", "2nd_half", "extra_time", "penalty"].includes(event.status)) status = "live";

      const currentScoreHome = status !== "scheduled" ? (event.home_score ?? null) : null;
      const currentScoreAway = status !== "scheduled" ? (event.away_score ?? null) : null;
      const updateData: Record<string, unknown> = {
        status,
        homeScore: currentScoreHome,
        awayScore: currentScoreAway,
        currentMinute: event.current_minute ?? null,
      };

      // Freeze 90' score when extra time or penalties begin
      const frozen = await prisma.match.findUnique({ where: { apiMatchId: event.id }, select: { homeScore90: true, awayScore90: true } });
      if (frozen && frozen.homeScore90 === null && (event.status === "extra_time" || event.status === "penalty")) {
        if (currentScoreHome !== null && currentScoreAway !== null) {
          updateData.homeScore90 = currentScoreHome;
          updateData.awayScore90 = currentScoreAway;
        }
      }

      // Determine winnerTeam and decidedBy when match finishes
      if (status === "finished" && currentScoreHome !== null && currentScoreAway !== null) {
        const wasExtraOrPenalty = frozen?.homeScore90 !== null;
        let decidedBy = "regular";
        let winnerTeam: string | null = null;

        if (currentScoreHome !== currentScoreAway) {
          // Clear winner — either regular or extra time
          decidedBy = wasExtraOrPenalty ? "extra_time" : "regular";
          winnerTeam = currentScoreHome > currentScoreAway ? "home" : "away";
        } else if (wasExtraOrPenalty) {
          // Draw at 120' — penalties decided it
          decidedBy = "penalties";
        }

        if (winnerTeam || decidedBy === "penalties") {
          if (decidedBy === "penalties") {
            // Try to determine winner from penalty shootout incidents
            try {
              const incidents = await fetchIncidents(event.id).catch(() => []);
              const shootoutGoals = incidents.filter(i => i.type === "goal" && i.goal_type === "penalty_shootout");
              if (shootoutGoals.length > 0) {
                const homePens = shootoutGoals.filter(g => g.is_home).length;
                const awayPens = shootoutGoals.filter(g => !g.is_home).length;
                if (homePens !== awayPens) {
                  winnerTeam = homePens > awayPens ? "home" : "away";
                }
              }
            } catch {}
          }
          Object.assign(updateData, { decidedBy, winnerTeam });
        }
      }

      if (status === "live" || status === "finished") {
        try {
          const [stats, incidents] = await Promise.all([
            fetchPlayerStats(event.id).catch(() => []),
            fetchIncidents(event.id).catch(() => []),
          ]);
          const homeStats = getTeamAggregateStats(stats, event.home_team_id);
          const awayStats = getTeamAggregateStats(stats, event.away_team_id);
          const totalShots = homeStats.totalShots + awayStats.totalShots;
          if (totalShots > 0 || status === "finished") {
            Object.assign(updateData, {
              totalShots,
              shotsOnGoal: homeStats.shotsOnGoal + awayStats.shotsOnGoal,
              fouls: homeStats.fouls + awayStats.fouls,
              yellowCards: homeStats.yellowCards + awayStats.yellowCards,
              redCards: homeStats.redCards + awayStats.redCards,
              saves: homeStats.saves + awayStats.saves,
              accuratePass: homeStats.accuratePass + awayStats.accuratePass,
              totalCross: homeStats.totalCross + awayStats.totalCross,
              substitutions: getTotalSubstitutions(incidents),
            });
          }
        } catch { /* stats not available yet */ }
      }

      await prisma.match.updateMany({
        where: { apiMatchId: event.id },
        data: updateData,
      });
    }
  } catch (e) {
    console.error("Live sync error:", e);
  }
}

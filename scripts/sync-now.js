/**
 * Script de sincronización manual de partidos desde Bzzoiro.
 * Uso: node scripts/sync-now.js
 */
const { PrismaClient } = require('@prisma/client');

const API_KEY = "261c45543020e4f0919e2796417bf27744005aef";
const API_URL = "https://sports.bzzoiro.com/api/v2";
const headers = { Authorization: `Token ${API_KEY}` };

const p = new PrismaClient();

function mapStatus(bzStatus) {
  if (bzStatus === "finished" || bzStatus === "ended") return "finished";
  if (["live", "inprogress", "halftime", "HT", "1H", "2H", "1st_half", "2nd_half", "extra_time", "extratime", "penalty", "penalties", "penalty_shootout", "shootout"].includes(bzStatus)) return "live";
  return "scheduled";
}

const PLACEHOLDER_PATTERN = /^(W|L)\d+$|^(Winner|Loser)\s+Match\s+\d+$|^\d[A-Z]$|^[A-Z]\d$/i;
function isValidTeam(name) {
  return !PLACEHOLDER_PATTERN.test((name || "").trim());
}

async function fetchMatchesByDate(dateStr) {
  const res = await fetch(`${API_URL}/events/?league_id=27&date=${dateStr}&limit=50`, { headers });
  const data = await res.json();
  return data.results || [];
}

async function getOrCreateWeek() {
  let week = await p.week.findFirst({ where: { isActive: true, isClosed: false } });
  if (!week) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 0);
    const lastWeek = await p.week.findFirst({ orderBy: { number: "desc" } });
    week = await p.week.create({
      data: { number: (lastWeek?.number || 0) + 1, startDate: weekStart, endDate: weekEnd },
    });
    console.log(`Semana ${week.number} creada`);
  }
  return week;
}

async function main() {
  console.log("Sincronizando partidos con Bzzoiro...\n");
  const week = await getOrCreateWeek();
  
  // Sync desde hoy -1 hasta +4 días
  const now = new Date();
  const daysToSync = [-1, 0, 1, 2, 3, 4];

  for (const offset of daysToSync) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(date);

    let events;
    try {
      events = await fetchMatchesByDate(dateStr);
    } catch (e) {
      console.log(`Error al obtener ${dateStr}: ${e.message}`);
      continue;
    }

    console.log(`📅 ${dateStr}: ${events.length} partidos`);

    for (const event of events) {
      // Saltar equipos placeholder (rondas futuras sin equipos definidos)
      if (!isValidTeam(event.home_team) || !isValidTeam(event.away_team)) continue;

      const status = mapStatus(event.status);
      const matchDate = new Date(event.event_date);
      const existing = await p.match.findUnique({ where: { apiMatchId: event.id } });

      if (!existing) {
        await p.match.create({
          data: {
            weekId: week.id,
            apiMatchId: event.id,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            homeTeamId: event.home_team_id,
            awayTeamId: event.away_team_id,
            matchDate,
            status,
            groupName: event.group_name || null,
            roundNumber: event.round_number || null,
            homeScore: status !== "scheduled" ? (event.home_score ?? null) : null,
            awayScore: status !== "scheduled" ? (event.away_score ?? null) : null,
            currentMinute: event.current_minute ?? null,
          },
        });
        const score = status !== "scheduled" ? ` ${event.home_score}-${event.away_score}` : "";
        console.log(`  ✅ Creado: ${event.home_team} vs ${event.away_team}${score} [${status}]`);
      } else {
        const currentScoreHome = status !== "scheduled" ? (event.home_score ?? null) : existing.homeScore;
        const currentScoreAway = status !== "scheduled" ? (event.away_score ?? null) : existing.awayScore;
        const data = {
          status,
          homeScore: currentScoreHome,
          awayScore: currentScoreAway,
          currentMinute: event.current_minute ?? existing.currentMinute,
        };

        // Freeze 90' score
        if (existing.homeScore90 === null && (event.status === "extra_time" || event.status === "extratime" || event.status === "penalty" || event.status === "penalties" || event.status === "penalty_shootout")) {
          if (currentScoreHome !== null && currentScoreAway !== null) {
            data.homeScore90 = currentScoreHome;
            data.awayScore90 = currentScoreAway;
          }
        }

        // Determine winnerTeam/decidedBy on finish
        if (status === "finished" && currentScoreHome !== null && currentScoreAway !== null) {
          const wasExtraOrPenalty = existing.homeScore90 !== null || data.homeScore90 !== undefined;
          if (currentScoreHome !== currentScoreAway) {
            data.decidedBy = wasExtraOrPenalty ? "extra_time" : "regular";
            data.winnerTeam = currentScoreHome > currentScoreAway ? "home" : "away";
          } else if (wasExtraOrPenalty) {
            data.decidedBy = "penalties";
          }
        }

        await p.match.update({ where: { id: existing.id }, data });
        const score = status !== "scheduled" ? ` ${event.home_score}-${event.away_score}` : "";
        console.log(`  🔄 Actualizado: ${event.home_team} vs ${event.away_team}${score} [${status}]`);
      }
    }
  }
  console.log("\n✅ Sincronización completa!");
}

main()
  .then(() => p.$disconnect())
  .catch(e => { console.error(e); p.$disconnect(); process.exit(1); });

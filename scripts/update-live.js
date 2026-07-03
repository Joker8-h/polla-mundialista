/**
 * Script de ACTUALIZACIÓN FORZADA de partidos desde Bzzoiro.
 * Actualiza TODOS los estados aunque ya existan en la BD.
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

function isValidTeam(name) {
  const n = (name || "").trim();
  if (!n) return false;
  if (n.includes("/")) return false;
  if (/^[WL]\d+$/i.test(n)) return false;
  if (/^(Winner|Loser)\s+Match\s+\d+$/i.test(n)) return false;
  if (/^\d[A-Z]$/i.test(n)) return false;
  if (/^[A-Z]\d$/i.test(n)) return false;
  if (/^[A-Z0-9]{1,3}$/i.test(n)) return false;
  return true;
}

async function fetchMatchesByDate(dateStr) {
  const res = await fetch(`${API_URL}/events/?league_id=27&date=${dateStr}&limit=50`, { headers });
  const data = await res.json();
  return data.results || [];
}

async function main() {
  console.log("Actualizando estados de partidos desde Bzzoiro...\n");

  // Fetch para hoy y ayer (hora Colombia)
  const now = new Date();
  const daysToSync = [-1, 0];

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

    console.log(`📅 ${dateStr}: ${events.length} partidos en API`);

    for (const event of events) {
      if (!isValidTeam(event.home_team) || !isValidTeam(event.away_team)) continue;

      const status = mapStatus(event.status);
      const existing = await p.match.findUnique({ where: { apiMatchId: event.id } });
      if (!existing) continue;

      const score = status !== "scheduled"
        ? ` ${event.home_score ?? "?"}-${event.away_score ?? "?"}`
        : "";
      const minute = event.current_minute ? ` [min ${event.current_minute}]` : "";

      const currentScoreHome = status !== "scheduled" ? (event.home_score ?? null) : null;
      const currentScoreAway = status !== "scheduled" ? (event.away_score ?? null) : null;
      const data = {
        status,
        homeScore: currentScoreHome,
        awayScore: currentScoreAway,
        currentMinute: event.current_minute ?? null,
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
      console.log(`  ✅ ${event.home_team} vs ${event.away_team}${score}${minute} (Raw status: ${event.status}) → [${status}]`);
    }
  }
  console.log("\n✅ Actualización completa!");
}

main()
  .then(() => p.$disconnect())
  .catch(e => { console.error(e); p.$disconnect(); process.exit(1); });

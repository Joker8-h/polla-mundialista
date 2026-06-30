import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMatchesByDate, fetchPlayerStats, fetchIncidents, getTeamAggregateStats, getTotalSubstitutions, getGoalScorers, parseEventDate } from "@/lib/bzzoiro";
import { calculatePoints, calculatePlayerGoalPoints } from "@/lib/scoring";
import { todayColombia } from "@/lib/colombia-time";
import { closeWeekAndAssignPrizes } from "@/lib/week-closer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function syncMatches() {
  const todayStr = todayColombia();
  const [y, m, d] = todayStr.split("-").map(Number);
  const colDayOfWeek = new Date(`${todayStr}T12:00:00-05:00`).getUTCDay();
  const monOffset = colDayOfWeek === 0 ? 6 : colDayOfWeek - 1;
  const now = new Date(`${todayStr}T${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date())}-05:00`);

  let week = await prisma.week.findFirst({ where: { isActive: true, isClosed: false } });
  if (!week) {
    const weekStart = new Date(Date.UTC(y, m - 1, d - monOffset, 5, 0, 0, 0));
    const weekEnd = new Date(Date.UTC(y, m - 1, d - monOffset + 6, 4, 59, 59, 0));
    const lastWeek = await prisma.week.findFirst({ orderBy: { number: "desc" } });
    week = await prisma.week.create({
      data: { number: (lastWeek?.number || 0) + 1, startDate: weekStart, endDate: weekEnd },
    });
  }

  const synced = [];
  // Loop from -1 to 5 to ensure we catch matches that might fall on a different UTC day
  for (let i = -1; i < 6; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(date);

    try {
      const events = await fetchMatchesByDate(dateStr);
      for (const event of events) {
        const existing = await prisma.match.findUnique({ where: { apiMatchId: event.id } });
          if (!existing) {
          // Map status
          let status = "scheduled";
          if (event.status === "finished" || event.status === "ended") status = "finished";
          else if (["live","inprogress","halftime","HT","1H","2H","1st_half","2nd_half","extra_time","penalty"].includes(event.status)) status = "live";

          await prisma.match.create({
            data: {
              weekId: week.id,
              apiMatchId: event.id,
              homeTeam: event.home_team,
              awayTeam: event.away_team,
              homeTeamId: event.home_team_id,
              awayTeamId: event.away_team_id,
              matchDate: parseEventDate(event.event_date),
              status,
              groupName: event.group_name,
              roundNumber: event.round_number,
              homeScore: status !== "scheduled" ? (event.home_score ?? null) : null,
              awayScore: status !== "scheduled" ? (event.away_score ?? null) : null,
            },
          });
          synced.push(`${event.home_team} vs ${event.away_team}`);
        } else {
          // Always update live status, date, and basic scores so dashboard is real-time
          const isFinishing = (event.status === "finished" || event.status === "ended") && existing.status !== "finished";
          
          if (isFinishing) {
            const [stats, incidents] = await Promise.all([
              fetchPlayerStats(event.id),
              fetchIncidents(event.id),
            ]);
            const homeStats = getTeamAggregateStats(stats, event.home_team_id);
            const awayStats = getTeamAggregateStats(stats, event.away_team_id);
            await prisma.match.update({
              where: { id: existing.id },
              data: {
                status: "finished",
                matchDate: parseEventDate(event.event_date),
                homeScore: event.home_score,
                awayScore: event.away_score,
                totalShots: homeStats.totalShots + awayStats.totalShots,
                shotsOnGoal: homeStats.shotsOnGoal + awayStats.shotsOnGoal,
                fouls: homeStats.fouls + awayStats.fouls,
                yellowCards: homeStats.yellowCards + awayStats.yellowCards,
                redCards: homeStats.redCards + awayStats.redCards,
                saves: homeStats.saves + awayStats.saves,
                accuratePass: homeStats.accuratePass + awayStats.accuratePass,
                totalCross: homeStats.totalCross + awayStats.totalCross,
                substitutions: getTotalSubstitutions(incidents),
              },
            });
            synced.push(`Resultados: ${event.home_team} ${event.home_score}-${event.away_score} ${event.away_team}`);
          } else {
            // Update live data and dates
            await prisma.match.update({
              where: { id: existing.id },
              data: {
                status: event.status,
                matchDate: parseEventDate(event.event_date),
                homeScore: event.home_score,
                awayScore: event.away_score,
              },
            });
            synced.push(`Actualizado: ${event.home_team} vs ${event.away_team}`);
          }
        }
      }
    } catch {
      // skip errores
    }
  }

  // Close week if past end date — assign prizes
  if (!week.isClosed && now >= week.endDate) {
    const result = await closeWeekAndAssignPrizes(week.id);
    synced.push(result.message);
  }

  return synced;
}

async function calculateAllPoints() {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "finished", homeScore: { not: null } },
    include: { predictions: true, playerGoalPredictions: true },
  });

  let calculated = 0;
  for (const match of finishedMatches) {
    try {
      const incidents = await fetchIncidents(match.apiMatchId);
      const scorers = getGoalScorers(incidents).map((s) => s.player);

      for (const prediction of match.predictions) {
        const pts = calculatePoints(prediction, match, scorers);
        await prisma.prediction.update({ where: { id: prediction.id }, data: { ...pts } });
      }

      for (const pgp of match.playerGoalPredictions) {
        const actualGoals = getGoalScorers(incidents).find((s) => s.playerId === pgp.playerId)?.count || 0;
        const pts = calculatePlayerGoalPoints(pgp.goals, actualGoals);
        await prisma.playerGoalPrediction.update({ where: { id: pgp.id }, data: { points: pts } });
      }
      calculated += match.predictions.length + match.playerGoalPredictions.length;
    } catch {
      // skip
    }
  }
  return calculated;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const synced = await syncMatches();
    const calculated = await calculateAllPoints();
    return NextResponse.json({ ok: true, syncedPartidos: synced.length, calculatedPronosticos: calculated });
  } catch (err) {
    console.error("Cron sync error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

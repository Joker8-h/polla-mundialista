import { prisma } from "../src/lib/prisma";
import { fetchMatchesByDate, fetchPlayerStats, fetchIncidents, getTeamAggregateStats, getTotalSubstitutions } from "../src/lib/bzzoiro";

async function syncWeek() {
  const now = new Date();

  // Find or create current week
  let week = await prisma.week.findFirst({ where: { isActive: true, isClosed: false } });
  if (!week) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 0);

    const lastWeek = await prisma.week.findFirst({ orderBy: { number: "desc" } });
    week = await prisma.week.create({
      data: {
        number: (lastWeek?.number || 0) + 1,
        startDate: weekStart,
        endDate: weekEnd,
      },
    });
    console.log(`Created week ${week.number}`);
  }

  // Sync matches for the next 3 days
  for (let i = 0; i < 3; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    try {
      const events = await fetchMatchesByDate(dateStr);
      for (const event of events) {
        const existing = await prisma.match.findUnique({ where: { apiMatchId: event.id } });
        if (!existing) {
          await prisma.match.create({
            data: {
              weekId: week.id,
              apiMatchId: event.id,
              homeTeam: event.home_team,
              awayTeam: event.away_team,
              homeTeamId: event.home_team_id,
              awayTeamId: event.away_team_id,
              matchDate: new Date(event.event_date),
              status: event.status,
              groupName: event.group_name,
              roundNumber: event.round_number,
            },
          });
          console.log(`Created match: ${event.home_team} vs ${event.away_team}`);
        } else if (event.status === "finished" && existing.status !== "finished") {
          // Update finished match with stats
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
          console.log(`Updated stats for: ${event.home_team} vs ${event.away_team}`);
        }
      }
    } catch (err) {
      console.error(`Error syncing ${dateStr}:`, err);
    }
  }

  console.log("Sync complete");
  await prisma.$disconnect();
}

syncWeek();

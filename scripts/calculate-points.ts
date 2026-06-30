import { prisma } from "../src/lib/prisma";
import { fetchIncidents, getGoalScorers } from "../src/lib/bzzoiro";
import { calculatePoints, calculatePlayerGoalPoints } from "../src/lib/scoring";

async function calculateAllPoints() {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "finished", homeScore: { not: null } },
    include: { predictions: true, playerGoalPredictions: true },
  });

  for (const match of finishedMatches) {
    const incidents = await fetchIncidents(match.apiMatchId);
    const scorers = getGoalScorers(incidents).map((s) => s.player);

    for (const prediction of match.predictions) {
      const pts = calculatePoints(prediction, match, scorers);
      await prisma.prediction.update({
        where: { id: prediction.id },
        data: { ...pts },
      });
    }

    // Calculate player goal prediction points
    for (const pgp of match.playerGoalPredictions) {
      const actualGoals = getGoalScorers(incidents)
        .find((s) => s.playerId === pgp.playerId)?.count || 0;
      const pts = calculatePlayerGoalPoints(pgp.goals, actualGoals);
      await prisma.playerGoalPrediction.update({
        where: { id: pgp.id },
        data: { points: pts },
      });
    }
  }

  console.log("Points calculated");
  await prisma.$disconnect();
}

async function closeWeek() {
  const week = await prisma.week.findFirst({ where: { isActive: true, isClosed: false } });
  if (!week) return;

  const now = new Date();
  if (now < week.endDate) return; // Week not over yet

  console.log(`Closing week ${week.number}`);

  // Get rankings
  const rankings = await prisma.prediction.groupBy({
    by: ["userId"],
    where: { match: { weekId: week.id } },
    _sum: { totalPoints: true },
    orderBy: { _sum: { totalPoints: "desc" } },
  });

  const prizes = await prisma.weekPrize.findMany({ where: { weekId: week.id }, orderBy: { rank: "asc" } });

  for (let i = 0; i < Math.min(rankings.length, prizes.length || 10); i++) {
    const rank = i + 1;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const r = (l: number) => Array.from({ length: l }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const typeMap: Record<string, string> = { toy: "TOY", cash: "CASH", discount: "DCTO", free_ticket: "FREE" };
    const prize = prizes[i] || { type: "discount" as const };
    const code = `F24-${r(4)}-${r(4)}-${typeMap[prize.type] || "PRZ"}`;

    await prisma.weeklyWinner.create({
      data: { weekId: week.id, userId: rankings[i].userId, rank, code },
    });

    console.log(`Winner #${rank}: user ${rankings[i].userId} - code: ${code}`);
  }

  // Close the week
  await prisma.week.update({
    where: { id: week.id },
    data: { isClosed: true },
  });

  console.log("Week closed");
  await prisma.$disconnect();
}

const command = process.argv[2];
if (command === "calculate") calculateAllPoints();
else if (command === "close-week") closeWeek();
else console.log("Usage: ts-node scripts/calculate-points.ts [calculate|close-week]");

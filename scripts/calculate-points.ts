import { prisma } from "../src/lib/prisma";
import { fetchIncidents, getGoalScorers } from "../src/lib/bzzoiro";
import { calculatePoints, calculatePlayerGoalPoints } from "../src/lib/scoring";
import { closeWeekAndAssignPrizes } from "../src/lib/week-closer";

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

  console.log("Points calculated for all finished matches");
  await prisma.$disconnect();
}

async function closeWeek() {
  const week = await prisma.week.findFirst({ where: { isActive: true, isClosed: false } });
  if (!week) {
    console.log("No active open week found");
    await prisma.$disconnect();
    return;
  }

  const result = await closeWeekAndAssignPrizes(week.id);
  console.log(result.message);
  await prisma.$disconnect();
}

const command = process.argv[2];
if (command === "calculate") calculateAllPoints();
else if (command === "close-week") closeWeek();
else console.log("Usage: ts-node scripts/calculate-points.ts [calculate|close-week]");

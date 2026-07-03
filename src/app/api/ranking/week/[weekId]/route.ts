import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ weekId: string }> }) {
  try {
    const { weekId } = await params;

    const week = await prisma.week.findUnique({ where: { id: weekId } });
    if (!week) {
      return NextResponse.json({ error: "Semana no encontrada" }, { status: 404 });
    }

    // Ensure points are persisted for all finished matches in this week
    const finishedMatches = await prisma.match.findMany({
      where: { weekId, status: "finished", homeScore: { not: null } },
    });

    for (const match of finishedMatches) {
      const unscoredPredictions = await prisma.prediction.findMany({
        where: { matchId: match.id, type: "base", totalPoints: 0 },
      });

      if (unscoredPredictions.length > 0) {
        const { fetchIncidents, getGoalScorers } = await import("@/lib/bzzoiro");
        const { calculatePoints } = await import("@/lib/scoring");

        try {
          const incidents = await fetchIncidents(match.apiMatchId);
          const scorers = getGoalScorers(incidents).map((s) => s.player);
          const matchData = {
            homeScore: match.homeScore, awayScore: match.awayScore,
            homeScore90: match.homeScore90, awayScore90: match.awayScore90,
            winnerTeam: match.winnerTeam, decidedBy: match.decidedBy,
            totalShots: match.totalShots, shotsOnGoal: match.shotsOnGoal,
            saves: match.saves, fouls: match.fouls,
            yellowCards: match.yellowCards, redCards: match.redCards,
            substitutions: match.substitutions, accuratePass: match.accuratePass,
            totalCross: match.totalCross,
          };

          for (const pred of unscoredPredictions) {
            const pts = calculatePoints(pred, matchData, scorers);
            await prisma.prediction.update({
              where: { id: pred.id },
              data: {
                homeScorePts: pts.homeScorePts, winnerPts: pts.winnerPts,
                goalscorerPts: pts.goalscorerPts, totalShotsPts: pts.totalShotsPts,
                shotsOnGoalPts: pts.shotsOnGoalPts, savesPts: pts.savesPts,
                foulsPts: pts.foulsPts, yellowCardsPts: pts.yellowCardsPts,
                redCardsPts: pts.redCardsPts, substitutionsPts: pts.substitutionsPts,
                accuratePassPts: pts.accuratePassPts, totalCrossPts: pts.totalCrossPts,
                totalPoints: pts.totalPoints,
              },
            });
          }
        } catch (e) {
          console.error(`Error scoring match ${match.id} for ranking:`, e);
        }
      }
    }

    const rankings = await prisma.prediction.groupBy({
      by: ["userId"],
      where: { match: { weekId } },
      _sum: { totalPoints: true },
      orderBy: { _sum: { totalPoints: "desc" } },
      take: 50,
    });

    const users = await prisma.user.findMany({
      where: { id: { in: rankings.map((r) => r.userId) } },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    let currentRank = 0;
    let previousPoints: number | null = null;
    const result: { rank: number; userId: string; name: string; city: string | null; points: number }[] = [];

    for (const r of rankings) {
      const points = r._sum.totalPoints || 0;
      if (points !== previousPoints) {
        currentRank = result.length + 1;
        previousPoints = points;
      }
      result.push({
        rank: currentRank,
        userId: r.userId,
        name: userMap.get(r.userId)?.name || "Desconocido",
        city: userMap.get(r.userId)?.city || null,
        points,
      });
    }

    return NextResponse.json({ rankings: result });
  } catch (e) {
    console.error("Error fetching ranking:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

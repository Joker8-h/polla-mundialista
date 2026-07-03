import { NextRequest } from "next/server";
import { getUserIdFromReq } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchPlayerStats,
  fetchIncidents,
  fetchLineups,
  getTeamAggregateStats,
  getTotalSubstitutions,
  getGoalScorers,
  getTeamImageUrl,
  syncLiveMatchesIfNecessary,
} from "@/lib/bzzoiro";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const userId = await getUserIdFromReq(req);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          await syncLiveMatchesIfNecessary();

          const match = await prisma.match.findUnique({ where: { id: matchId } });
          if (!match) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ match: null })}\n\n`));
            return;
          }

          const isFinished = match.status === "finished";
          const isLive = match.status === "live" || match.status === "inprogress";

          let liveStats = null;
          let incidents: any[] = [];
          let lineups = null;
          let goalScorers: { player: string; playerId: number; count: number }[] = [];

          if (isFinished || isLive) {
            try {
              const [stats, inc, lin] = await Promise.all([
                fetchPlayerStats(match.apiMatchId).catch(() => []),
                fetchIncidents(match.apiMatchId).catch(() => []),
                fetchLineups(match.apiMatchId).catch(() => null),
              ]);

              const homeStats = getTeamAggregateStats(stats, match.homeTeamId);
              const awayStats = getTeamAggregateStats(stats, match.awayTeamId);
              const subs = getTotalSubstitutions(inc);
              goalScorers = getGoalScorers(inc);

              const apiHasData = homeStats.totalShots > 0 || homeStats.shotsOnGoal > 0 ||
                homeStats.fouls > 0 || awayStats.totalShots > 0 || awayStats.fouls > 0;

              if (apiHasData) {
                liveStats = {
                  home: { ...homeStats, substitutions: subs },
                  away: { ...awayStats, substitutions: subs },
                };
              } else {
                const dbHasData = (match.totalShots ?? 0) > 0 || (match.fouls ?? 0) > 0 ||
                  (match.homeScore ?? 0) > 0 || (match.awayScore ?? 0) > 0 ||
                  (match.substitutions ?? 0) > 0;

                if (dbHasData) {
                  const homeRatio = 0.5;
                  const awayRatio = 0.5;
                  const split = (val: number | null, ratio: number) => Math.round((val ?? 0) * ratio);
                  const totalSubs = match.substitutions ?? 0;
                  liveStats = {
                    home: {
                      totalShots: split(match.totalShots, homeRatio),
                      shotsOnGoal: split(match.shotsOnGoal, homeRatio),
                      fouls: split(match.fouls, homeRatio),
                      yellowCards: split(match.yellowCards, homeRatio),
                      redCards: split(match.redCards, homeRatio),
                      saves: split(match.saves, awayRatio),
                      accuratePass: split(match.accuratePass, homeRatio),
                      totalCross: split(match.totalCross, homeRatio),
                      substitutions: totalSubs,
                    },
                    away: {
                      totalShots: split(match.totalShots, awayRatio),
                      shotsOnGoal: split(match.shotsOnGoal, awayRatio),
                      fouls: split(match.fouls, awayRatio),
                      yellowCards: split(match.yellowCards, awayRatio),
                      redCards: split(match.redCards, awayRatio),
                      saves: split(match.saves, homeRatio),
                      accuratePass: split(match.accuratePass, awayRatio),
                      totalCross: split(match.totalCross, awayRatio),
                      substitutions: totalSubs,
                    },
                  };
                }
              }
              incidents = inc;
              lineups = lin;
            } catch {}
          }

          const actualScorers = goalScorers.map((g) => g.player);

          let userPrediction = null;
          if (userId) {
            const prediction = await prisma.prediction.findFirst({
              where: { userId, matchId, type: "base" },
            });

            if (prediction) {
              let predictionPoints = null;
              if (isFinished) {
                const { calculatePoints } = await import("@/lib/scoring");
                predictionPoints = calculatePoints(
                  {
                    homeScore: prediction.homeScore,
                    awayScore: prediction.awayScore,
                    winner: prediction.winner,
                    goalscorer: prediction.goalscorer,
                    totalShots: prediction.totalShots,
                    shotsOnGoal: prediction.shotsOnGoal,
                    saves: prediction.saves,
                    fouls: prediction.fouls,
                    yellowCards: prediction.yellowCards,
                    redCards: prediction.redCards,
                    substitutions: prediction.substitutions,
                    accuratePass: prediction.accuratePass,
                    totalCross: prediction.totalCross,
                  },
                  {
                    homeScore: match.homeScore,
                    awayScore: match.awayScore,
                    homeScore90: match.homeScore90,
                    awayScore90: match.awayScore90,
                    winnerTeam: match.winnerTeam,
                    decidedBy: match.decidedBy,
                    totalShots: match.totalShots,
                    shotsOnGoal: match.shotsOnGoal,
                    saves: match.saves,
                    fouls: match.fouls,
                    yellowCards: match.yellowCards,
                    redCards: match.redCards,
                    substitutions: match.substitutions,
                    accuratePass: match.accuratePass,
                    totalCross: match.totalCross,
                  },
                  actualScorers
                );
              }
              userPrediction = { ...prediction, points: predictionPoints };
            }
          }

          const allPredictions = await prisma.prediction.findMany({
            where: { matchId, type: "base" },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          });

          const upcomingMatches = await prisma.match.findMany({
            where: { matchDate: { gt: new Date() }, id: { not: matchId } },
            orderBy: { matchDate: "asc" },
            take: 5,
          });

          const weekRanking = await prisma.prediction.findMany({
            where: { match: { weekId: match.weekId }, type: "base", totalPoints: { gt: 0 } },
            include: { user: { select: { name: true } } },
            orderBy: { totalPoints: "desc" },
            take: 50,
          });

          const userPointsMap = new Map<string, { name: string; totalPoints: number }>();
          for (const p of weekRanking) {
            const existing = userPointsMap.get(p.userId);
            if (existing) {
              existing.totalPoints += p.totalPoints;
            } else {
              userPointsMap.set(p.userId, { name: p.user.name, totalPoints: p.totalPoints });
            }
          }
          const groupedRanking = Array.from(userPointsMap.values())
            .sort((a, b) => b.totalPoints - a.totalPoints);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                match: {
                  ...match,
                  homeTeamImageUrl: getTeamImageUrl(match.homeTeamId),
                  awayTeamImageUrl: getTeamImageUrl(match.awayTeamId),
                },
                liveStats,
                incidents,
                lineups,
                goalScorers,
                penaltyHome: match.penaltyHome,
                penaltyAway: match.penaltyAway,
                userPrediction,
                allPredictions: allPredictions.map((p) => ({
                  name: p.user.name,
                  homeScore: p.homeScore,
                  awayScore: p.awayScore,
                  totalPoints: p.totalPoints,
                })),
                upcomingMatches: upcomingMatches.map((m) => ({
                  id: m.id,
                  homeTeam: m.homeTeam,
                  awayTeam: m.awayTeam,
                  matchDate: m.matchDate,
                  status: m.status,
                  homeScore: m.homeScore,
                  awayScore: m.awayScore,
                })),
                weekRanking: groupedRanking.slice(0, 10),
              })}\n\n`
            )
          );
        } catch {
          // Don't close stream on error
        }
      };

      await send();
      const interval = setInterval(send, 5000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    await syncLiveMatchesIfNecessary();

    const match = await prisma.match.findUnique({
      where: { id },
    });
    if (!match) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    const userPrediction = await prisma.prediction.findFirst({
      where: { userId, matchId: id, type: "base" },
    });

    const isFinished = match.status === "finished";
    const isLive = match.status === "live" || match.status === "inprogress";

    let liveStats = null;
    let incidents: import("@/lib/bzzoiro").Incident[] = [];
    let lineups: import("@/lib/bzzoiro").Lineups | null = null;
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

        // Check if API returned any real stats
        const apiHasData = homeStats.totalShots > 0 || homeStats.shotsOnGoal > 0 ||
          homeStats.fouls > 0 || awayStats.totalShots > 0 || awayStats.fouls > 0;

        if (apiHasData) {
          liveStats = {
            home: { ...homeStats, substitutions: subs },
            away: { ...awayStats, substitutions: subs },
          };
        } else {
          // Fallback to DB stats (manually entered by admin or from a previous sync)
          const dbHasData = (match.totalShots ?? 0) > 0 || (match.fouls ?? 0) > 0 ||
            (match.homeScore ?? 0) > 0 || (match.awayScore ?? 0) > 0 ||
            (match.substitutions ?? 0) > 0;

          if (dbHasData) {
            // DB stats are totals — split evenly
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
                saves: split(match.saves, awayRatio), // saves for home = away's blocked shots
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
      } catch (e) {
          console.error("Error fetching match detail stats:", e);
      }
    }

    const actualScorers = goalScorers.map((g) => g.player);

    let predictionWithPoints = null;
    if (isFinished) {
      const { calculatePoints } = await import("@/lib/scoring");

      // Check if scoring has been done: if ALL predictions have totalPoints=0, scoring hasn't run yet
      const allPredictionsForMatch = await prisma.prediction.findMany({
        where: { matchId: id, type: "base" },
      });
      const anyScored = allPredictionsForMatch.some(p => p.totalPoints > 0);
      const needsScoring = !anyScored && allPredictionsForMatch.length > 0;

      if (needsScoring) {
        const matchData = {
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
        };

        // Persist points for ALL predictions of this match
        for (const pred of allPredictionsForMatch) {
          const pts = calculatePoints(
            {
              homeScore: pred.homeScore, awayScore: pred.awayScore,
              winner: pred.winner, goalscorer: pred.goalscorer,
              totalShots: pred.totalShots, shotsOnGoal: pred.shotsOnGoal,
              saves: pred.saves, fouls: pred.fouls,
              yellowCards: pred.yellowCards, redCards: pred.redCards,
              substitutions: pred.substitutions, accuratePass: pred.accuratePass,
              totalCross: pred.totalCross,
            },
            matchData,
            actualScorers
          );
          await prisma.prediction.update({
            where: { id: pred.id },
            data: {
              homeScorePts: pts.homeScorePts,
              winnerPts: pts.winnerPts,
              goalscorerPts: pts.goalscorerPts,
              totalShotsPts: pts.totalShotsPts,
              shotsOnGoalPts: pts.shotsOnGoalPts,
              savesPts: pts.savesPts,
              foulsPts: pts.foulsPts,
              yellowCardsPts: pts.yellowCardsPts,
              redCardsPts: pts.redCardsPts,
              substitutionsPts: pts.substitutionsPts,
              accuratePassPts: pts.accuratePassPts,
              totalCrossPts: pts.totalCrossPts,
              totalPoints: pts.totalPoints,
            },
          });
        }

        // Re-fetch user prediction with updated points
        const updatedPrediction = await prisma.prediction.findFirst({
          where: { userId, matchId: id, type: "base" },
        });
        if (updatedPrediction) {
          const userPts = calculatePoints(
            {
              homeScore: updatedPrediction.homeScore, awayScore: updatedPrediction.awayScore,
              winner: updatedPrediction.winner, goalscorer: updatedPrediction.goalscorer,
              totalShots: updatedPrediction.totalShots, shotsOnGoal: updatedPrediction.shotsOnGoal,
              saves: updatedPrediction.saves, fouls: updatedPrediction.fouls,
              yellowCards: updatedPrediction.yellowCards, redCards: updatedPrediction.redCards,
              substitutions: updatedPrediction.substitutions, accuratePass: updatedPrediction.accuratePass,
              totalCross: updatedPrediction.totalCross,
            },
            matchData,
            actualScorers
          );
          predictionWithPoints = { ...updatedPrediction, points: userPts };
        }
      } else if (userPrediction) {
        // Points already persisted, use DB values
        predictionWithPoints = { ...userPrediction };
      }
    } else if (userPrediction) {
      predictionWithPoints = { ...userPrediction };
    }

    const leaderboard = await prisma.prediction.findMany({
      where: {
        matchId: id,
        type: "base",
        totalPoints: { gt: 0 },
      },
      include: { user: { select: { name: true, city: true } } },
      orderBy: { totalPoints: "desc" },
      take: 10,
    });

    const allPredictions = await prisma.prediction.findMany({
      where: { matchId: id, type: "base" },
      include: { user: { select: { name: true, city: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const upcomingMatches = await prisma.match.findMany({
      where: {
        matchDate: { gt: new Date() },
        id: { not: id },
      },
      orderBy: { matchDate: "asc" },
      take: 5,
    });

    const weekRanking = await prisma.prediction.findMany({
      where: {
        match: { weekId: match.weekId },
        type: "base",
        totalPoints: { gt: 0 },
      },
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
        userPointsMap.set(p.userId, {
          name: p.user.name,
          totalPoints: p.totalPoints,
        });
      }
    }
    const groupedRanking = Array.from(userPointsMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints);

    const getPlayers = async (teamId: number) => {
      let players = await prisma.playerCache.findMany({ where: { teamId } });
      if (players.length === 0) {
        try {
          const res = await fetch(`${process.env.BZZOIRO_API_URL}/players/?team_id=${teamId}&limit=50`, { 
            headers: { Authorization: `Token ${process.env.BZZOIRO_API_KEY}` } 
          });
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            await prisma.playerCache.createMany({
              data: data.results.map((p: any) => ({
                id: p.id,
                name: p.name,
                shortName: p.short_name || p.name,
                teamId: teamId,
                position: p.position,
              })),
              skipDuplicates: true,
            });
            players = data.results;
          }
        } catch (e) {
          console.error("Error fetching players for team", teamId, e);
        }
      }
      return players;
    };

    const [homePlayers, awayPlayers] = await Promise.all([
      getPlayers(match.homeTeamId),
      getPlayers(match.awayTeamId),
    ]);

    return NextResponse.json({
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
      players: {
        home: { teamName: match.homeTeam, players: homePlayers.map(p => ({ id: p.id, name: p.name })) },
        away: { teamName: match.awayTeam, players: awayPlayers.map(p => ({ id: p.id, name: p.name })) },
      },
      userPrediction: predictionWithPoints,
      leaderboard: leaderboard.map((p) => ({
        name: p.user.name,
        city: p.user.city,
        totalPoints: p.totalPoints,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
      })),
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
    });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

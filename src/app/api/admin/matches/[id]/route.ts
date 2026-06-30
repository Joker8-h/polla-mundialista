import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await getAdminFromReq(req);
    if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const {
      status,
      homeScore,
      awayScore,
      totalShots,
      shotsOnGoal,
      fouls,
      yellowCards,
      redCards,
      saves,
      accuratePass,
      totalCross,
      substitutions,
      currentMinute,
    } = body;

    const updated = await prisma.match.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(homeScore !== undefined && { homeScore: homeScore === "" ? null : Number(homeScore) }),
        ...(awayScore !== undefined && { awayScore: awayScore === "" ? null : Number(awayScore) }),
        ...(totalShots !== undefined && { totalShots: totalShots === "" ? null : Number(totalShots) }),
        ...(shotsOnGoal !== undefined && { shotsOnGoal: shotsOnGoal === "" ? null : Number(shotsOnGoal) }),
        ...(fouls !== undefined && { fouls: fouls === "" ? null : Number(fouls) }),
        ...(yellowCards !== undefined && { yellowCards: yellowCards === "" ? null : Number(yellowCards) }),
        ...(redCards !== undefined && { redCards: redCards === "" ? null : Number(redCards) }),
        ...(saves !== undefined && { saves: saves === "" ? null : Number(saves) }),
        ...(accuratePass !== undefined && { accuratePass: accuratePass === "" ? null : Number(accuratePass) }),
        ...(totalCross !== undefined && { totalCross: totalCross === "" ? null : Number(totalCross) }),
        ...(substitutions !== undefined && { substitutions: substitutions === "" ? null : Number(substitutions) }),
        ...(currentMinute !== undefined && { currentMinute: currentMinute === "" ? null : Number(currentMinute) }),
      },
    });

    // Auto-recalculate points for all predictions when match is finished
    if (updated.status === "finished") {
      try {
        const { calculatePoints } = await import("@/lib/scoring");
        const { fetchIncidents, getGoalScorers } = await import("@/lib/bzzoiro");
        const predictions = await prisma.prediction.findMany({
          where: { matchId: id, type: "base" },
        });

        const incidents = await fetchIncidents(updated.apiMatchId).catch(() => []);
        const actualScorers = getGoalScorers(incidents).map((s: { player: string }) => s.player);

        await Promise.all(
          predictions.map(async (pred) => {
            const pts = calculatePoints(
              {
                homeScore: pred.homeScore,
                awayScore: pred.awayScore,
                winner: pred.winner,
                goalscorer: pred.goalscorer,
                totalShots: pred.totalShots,
                shotsOnGoal: pred.shotsOnGoal,
                saves: pred.saves,
                fouls: pred.fouls,
                yellowCards: pred.yellowCards,
                redCards: pred.redCards,
                substitutions: pred.substitutions,
                accuratePass: pred.accuratePass,
                totalCross: pred.totalCross,
              },
              {
                homeScore: updated.homeScore,
                awayScore: updated.awayScore,
                totalShots: updated.totalShots,
                shotsOnGoal: updated.shotsOnGoal,
                saves: updated.saves,
                fouls: updated.fouls,
                yellowCards: updated.yellowCards,
                redCards: updated.redCards,
                substitutions: updated.substitutions,
                accuratePass: updated.accuratePass,
                totalCross: updated.totalCross,
              },
              actualScorers
            );
            await prisma.prediction.update({
              where: { id: pred.id },
              data: {
                totalPoints: pts.totalPoints,
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
              },
            });
          })
        );
        console.log(`Recalculated points for ${predictions.length} predictions on match ${id}`);
      } catch (e) {
        console.error("Points recalculation error:", e);
      }
    }

    return NextResponse.json({ match: updated });
  } catch (error) {
    console.error("Admin match update error:", error);
    return NextResponse.json({ error: "Error actualizando partido" }, { status: 500 });
  }
}


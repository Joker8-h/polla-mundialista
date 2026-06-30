import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromReq } from "@/lib/auth";
import { toColombiaDate } from "@/lib/colombia-time";

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromReq(req);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const { matchId } = body;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  if (new Date() > match.matchDate) {
    return NextResponse.json({ error: "El partido ya comenzó y no se puede pronosticar" }, { status: 400 });
  }

  const colMatchDate = toColombiaDate(match.matchDate);
  const [y, m, d] = colMatchDate.split("-").map(Number);
  const matchDay = new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1, 5, 0, 0, 0));

  const dayPass = await prisma.dayPass.findFirst({
    where: { userId, date: { gte: matchDay, lt: nextDay } },
  });

  if (!dayPass) {
    return NextResponse.json({ error: "No tienes pase para este día. Por favor realiza el pago." }, { status: 403 });
  }

  const parseIntSafe = (v: unknown, def = 0): number => {
    const n = parseInt(String(v ?? ""), 10);
    return isNaN(n) || n < 0 ? def : n;
  };

  const hs = parseIntSafe(body.homeScore);
  const aws = parseIntSafe(body.awayScore);
  const winner = hs > aws ? "home" : hs < aws ? "away" : "draw";
  const goalscorer = typeof body.goalscorer === "string" && body.goalscorer.trim().length > 0 ? body.goalscorer.trim() : null;

  const prediction = await prisma.prediction.upsert({
    where: {
      userId_matchId_type: {
        userId,
        matchId,
        type: "base",
      },
    },
    update: {
      homeScore: hs,
      awayScore: aws,
      winner,
      goalscorer,
      totalShots: parseIntSafe(body.totalShots),
      shotsOnGoal: parseIntSafe(body.shotsOnGoal),
      saves: parseIntSafe(body.saves),
      fouls: parseIntSafe(body.fouls),
      yellowCards: parseIntSafe(body.yellowCards),
      redCards: parseIntSafe(body.redCards),
      substitutions: parseIntSafe(body.substitutions),
      accuratePass: parseIntSafe(body.accuratePass),
      totalCross: parseIntSafe(body.totalCross),
      dayPassId: dayPass?.id || undefined,
    },
    create: {
      userId,
      matchId,
      type: "base",
      dayPassId: dayPass?.id || undefined,
      homeScore: hs,
      awayScore: aws,
      winner,
      goalscorer,
      totalShots: parseIntSafe(body.totalShots),
      shotsOnGoal: parseIntSafe(body.shotsOnGoal),
      saves: parseIntSafe(body.saves),
      fouls: parseIntSafe(body.fouls),
      yellowCards: parseIntSafe(body.yellowCards),
      redCards: parseIntSafe(body.redCards),
      substitutions: parseIntSafe(body.substitutions),
      accuratePass: parseIntSafe(body.accuratePass),
      totalCross: parseIntSafe(body.totalCross),
    },
  });

  return NextResponse.json({ success: true, prediction });
}

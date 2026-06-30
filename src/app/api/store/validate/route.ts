import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ valid: false, error: "Código requerido" }, { status: 400 });
  }

  const winner = await prisma.weeklyWinner.findUnique({
    where: { code },
    include: { user: true, week: true },
  });
  if (!winner) {
    return NextResponse.json({ valid: false, error: "Código no encontrado" }, { status: 404 });
  }

  const now = new Date();
  const expiresAt = new Date(winner.week.endDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const prize = await prisma.weekPrize.findUnique({
    where: { weekId_rank: { weekId: winner.weekId, rank: winner.rank } },
  });

  const prizeInfo = prize
    ? { label: prize.label, value: prize.value, unit: prize.unit, minPurchase: prize.minPurchase }
    : { label: "Premio", value: null, unit: null, minPurchase: null };

  return NextResponse.json({
    valid: !winner.claimed && !winner.invalidatedAt && now <= expiresAt,
    winner: { name: winner.user.name, whatsapp: winner.user.whatsapp },
    code: winner.code,
    prize: prizeInfo,
    expiresAt: expiresAt.toISOString(),
    used: winner.claimed,
    redeemedAt: winner.claimedAt?.toISOString() || null,
  });
}

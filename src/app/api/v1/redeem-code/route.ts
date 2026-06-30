import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const { code } = await req.json();

  if (!apiKey || !code) {
    return NextResponse.json({ success: false, error: "API key y code requeridos" }, { status: 400 });
  }

  const key = await prisma.apiKey.findFirst({ where: { key: apiKey, isActive: true } });
  if (!key) {
    return NextResponse.json({ success: false, error: "API Key inválida" }, { status: 401 });
  }

  const winner = await prisma.weeklyWinner.findUnique({
    where: { code },
    include: { user: true, week: true },
  });

  if (!winner) {
    return NextResponse.json({ success: false, error: "Código no encontrado" }, { status: 404 });
  }
  if (winner.claimed) {
    return NextResponse.json({ success: false, error: "Código ya fue redimido" }, { status: 400 });
  }
  if (winner.invalidatedAt) {
    return NextResponse.json({ success: false, error: "Código invalidado" }, { status: 400 });
  }

  const expiresAt = new Date(winner.week.endDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (new Date() > expiresAt) {
    return NextResponse.json({ success: false, error: "Código expirado" }, { status: 400 });
  }

  await prisma.weeklyWinner.update({
    where: { id: winner.id },
    data: { claimed: true, claimedAt: new Date() },
  });

  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });

  const prize = await prisma.weekPrize.findUnique({
    where: { weekId_rank: { weekId: winner.weekId, rank: winner.rank } },
  });

  return NextResponse.json({
    success: true,
    message: "Código canjeado exitosamente",
    winnerName: winner.user.name,
    prizeLabel: prize?.label || "Premio",
  });
}

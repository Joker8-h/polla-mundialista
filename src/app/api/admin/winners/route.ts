import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const winners = await prisma.weeklyWinner.findMany({
    include: { user: true, week: true },
    orderBy: [{ week: { number: "desc" } }, { rank: "asc" }],
    take: 50,
  });

  const prizes = await prisma.weekPrize.findMany();
  const prizeMap = new Map(prizes.map((p) => [`${p.weekId}-${p.rank}`, p]));

  const enriched = winners.map((w) => {
    const prize = prizeMap.get(`${w.weekId}-${w.rank}`);
    return { ...w, prize: prize || null };
  });

  return NextResponse.json({ winners: enriched });
}

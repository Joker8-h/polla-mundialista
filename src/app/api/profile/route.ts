import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromReq } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromReq(req);
  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const predictions = await prisma.prediction.findMany({
    where: { userId },
    include: { match: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const winnings = await prisma.weeklyWinner.findMany({
    where: { userId },
    include: { week: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ user, predictions, winnings });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromReq } from "@/lib/auth";
import { toColombiaDate } from "@/lib/colombia-time";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ weekId: string }> }) {
  try {
    const { weekId } = await params;
    const week = await prisma.week.findUnique({ where: { id: weekId } });
    if (!week) return NextResponse.json({ error: "Semana no encontrada" }, { status: 404 });

    const matches = await prisma.match.findMany({
      where: {
        matchDate: {
          gte: week.startDate,
          lte: week.endDate,
        },
      },
      orderBy: { matchDate: "asc" },
    });

    const userId = await getUserIdFromReq(_req);
    let paidDays: string[] = [];
    if (userId) {
      const dayPasses = await prisma.dayPass.findMany({
        where: {
          userId,
          date: { gte: week.startDate, lte: week.endDate },
        },
        select: { date: true },
      });
      paidDays = [...new Set(dayPasses.map((dp) => toColombiaDate(dp.date)))];
    }

    return NextResponse.json({ week, matches, paidDays });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

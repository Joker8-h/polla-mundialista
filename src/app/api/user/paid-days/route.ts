import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromReq } from "@/lib/auth";
import { colombiaWeekRange, toColombiaDate } from "@/lib/colombia-time";

export async function GET(_req: NextRequest) {
  try {
    const userId = await getUserIdFromReq(_req);
    if (!userId) return NextResponse.json({ paidDays: [] });

    const { startDate, endDate } = colombiaWeekRange();

    const dayPasses = await prisma.dayPass.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true },
    });

    const paidDays = dayPasses.map((dp) => toColombiaDate(dp.date));
    const uniqueDays = [...new Set(paidDays)];

    return NextResponse.json({ paidDays: uniqueDays });
  } catch {
    return NextResponse.json({ paidDays: [] });
  }
}

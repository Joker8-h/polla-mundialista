import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeekForColombiaDate, todayColombia } from "@/lib/colombia-time";

export async function GET() {
  const todayStr = todayColombia();
  const { startDate, endDate } = getWeekForColombiaDate(todayStr);

  let week = await prisma.week.findFirst({
    where: { startDate, endDate },
  });

  if (!week) {
    week = await prisma.week.findFirst({ where: { isActive: true, isClosed: false } });
  }

  return NextResponse.json({ weekId: week?.id || null, week });
}

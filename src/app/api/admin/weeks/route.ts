import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const currentWeek = await prisma.week.findFirst({ orderBy: { number: 'desc' } });
  const nextNumber = (currentWeek?.number || 0) + 1;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 0);
  const newWeek = await prisma.week.create({
    data: {
      number: nextNumber,
      startDate: weekStart,
      endDate: weekEnd,
      isActive: true,
      isClosed: false,
    }
  });
  return NextResponse.json({ week: newWeek });
}

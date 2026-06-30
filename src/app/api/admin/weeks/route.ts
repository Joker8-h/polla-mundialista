import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/auth";
import { todayColombia } from "@/lib/colombia-time";

export async function POST(req: NextRequest) {
  const adminId = await getAdminFromReq(req);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const currentWeek = await prisma.week.findFirst({ orderBy: { number: 'desc' } });
  const nextNumber = (currentWeek?.number || 0) + 1;
  const todayStr = todayColombia();
  const [y, m, d] = todayStr.split("-").map(Number);
  const colDayOfWeek = new Date(`${todayStr}T12:00:00-05:00`).getUTCDay();
  const weekStart = new Date(Date.UTC(y, m - 1, d - colDayOfWeek, 5, 0, 0, 0));
  const weekEnd = new Date(Date.UTC(y, m - 1, d - colDayOfWeek + 6, 4, 59, 59, 0));
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

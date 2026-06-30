import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const week = await prisma.week.findFirst({ where: { isActive: true, isClosed: false } });
  return NextResponse.json({ weekId: week?.id || null, week });
}

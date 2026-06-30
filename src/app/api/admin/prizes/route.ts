import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const week = await prisma.week.findFirst({ where: { isActive: true, isClosed: false } });
  if (!week) return NextResponse.json({ prizes: [] });
  const prizes = await prisma.weekPrize.findMany({ where: { weekId: week.id }, orderBy: { rank: "asc" } });
  return NextResponse.json({ week, prizes });
}

export async function POST(req: NextRequest) {
  const { weekId, prizes } = await req.json();
  await prisma.weekPrize.deleteMany({ where: { weekId } });
  const created = await Promise.all(
    prizes.map((p: { rank: number; label: string; type: string; value?: number; unit?: string; minPurchase?: number; imageUrl?: string }) =>
      prisma.weekPrize.create({
        data: { weekId, rank: p.rank, label: p.label, type: p.type, value: p.value, unit: p.unit, minPurchase: p.minPurchase, imageUrl: p.imageUrl },
      })
    )
  );
  return NextResponse.json({ prizes: created });
}

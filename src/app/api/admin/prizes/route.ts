import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const adminId = await getAdminFromReq(req);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const week = await prisma.week.findFirst({ where: { isActive: true, isClosed: false } });
  if (!week) return NextResponse.json({ prizes: [] });
  const prizes = await prisma.weekPrize.findMany({ where: { weekId: week.id }, orderBy: { rank: "asc" } });
  return NextResponse.json({ week, prizes });
}

export async function POST(req: NextRequest) {
  const adminId = await getAdminFromReq(req);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const { weekId, prizes } = body;
  await prisma.weekPrize.deleteMany({ where: { weekId } });
  const created = await Promise.all(
    prizes.map((p: { rank: number; label: string; description?: string; type: string; value?: number; unit?: string; minPurchase?: number; imageUrl?: string }) =>
      prisma.weekPrize.create({
        data: { weekId, rank: p.rank, label: p.label, description: p.description, type: p.type, value: p.value, unit: p.unit, minPurchase: p.minPurchase, imageUrl: p.imageUrl },
      })
    )
  );
  return NextResponse.json({ prizes: created });
}

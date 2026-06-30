import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const winner = await prisma.weeklyWinner.findUnique({ where: { code } });
  if (!winner) {
    return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });
  }

  await prisma.weeklyWinner.update({
    where: { id: winner.id },
    data: { invalidatedAt: new Date(), claimed: true, claimedAt: new Date() },
  });

  return NextResponse.json({ success: true, message: "Código invalidado (tienda física)" });
}

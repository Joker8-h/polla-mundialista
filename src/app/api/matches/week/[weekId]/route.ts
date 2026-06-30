import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ weekId: string }> }) {
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

    return NextResponse.json({ week, matches });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

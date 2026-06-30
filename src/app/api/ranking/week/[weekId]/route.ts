import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ weekId: string }> }) {
  try {
    const { weekId } = await params;

    const week = await prisma.week.findUnique({ where: { id: weekId } });
    if (!week) {
      return NextResponse.json({ error: "Semana no encontrada" }, { status: 404 });
    }

    const rankings = await prisma.prediction.groupBy({
      by: ["userId"],
      where: { match: { weekId } },
      _sum: { totalPoints: true },
      orderBy: { _sum: { totalPoints: "desc" } },
      take: 50,
    });

    const users = await prisma.user.findMany({
      where: { id: { in: rankings.map((r) => r.userId) } },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    let currentRank = 0;
    let previousPoints: number | null = null;
    const result: { rank: number; userId: string; name: string; city: string | null; points: number }[] = [];

    for (const r of rankings) {
      const points = r._sum.totalPoints || 0;
      if (points !== previousPoints) {
        currentRank = result.length + 1;
        previousPoints = points;
      }
      result.push({
        rank: currentRank,
        userId: r.userId,
        name: userMap.get(r.userId)?.name || "Desconocido",
        city: userMap.get(r.userId)?.city || null,
        points,
      });
    }

    return NextResponse.json({ rankings: result });
  } catch (e) {
    console.error("Error fetching ranking:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

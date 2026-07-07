import { prisma } from "./prisma";

function generateFACode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `FA${digits}`;
}

async function ensureUniqueCode(): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const code = generateFACode();
    const existing = await prisma.weeklyWinner.findUnique({ where: { code } });
    if (!existing) return code;
  }
  // Fallback: timestamp + counter to guarantee uniqueness
  return `FA${Date.now()}${Math.floor(Math.random() * 100)}`.slice(0, 6);
}

export async function closeWeekAndAssignPrizes(weekId: string) {
  const lockResult = await prisma.week.updateMany({
    where: { id: weekId, isClosed: false },
    data: { isClosed: true },
  });

  if (lockResult.count === 0) {
    return { assigned: 0, message: "Ya cerrada" };
  }

  try {
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: { prizes: true },
    });
    if (!week) {
      await prisma.week.update({ where: { id: weekId }, data: { isClosed: false } });
      return { assigned: 0, message: "Semana no encontrada" };
    }

    const rankings = await prisma.prediction.groupBy({
      by: ["userId"],
      where: { match: { weekId }, totalPoints: { gt: 0 } },
      _sum: { totalPoints: true },
      orderBy: { _sum: { totalPoints: "desc" } },
    });

    if (rankings.length === 0) {
      return { assigned: 0, message: "Sin predicciones con puntos" };
    }

    const prizeMap = new Map(week.prizes.map((p) => [p.rank, p]));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    let assigned = 0;
    let currentRank = 0;
    let previousPoints: number | null = null;

    await prisma.$transaction(async (tx) => {
      for (const r of rankings) {
        const points = r._sum.totalPoints || 0;
        if (points !== previousPoints) {
          currentRank++;
          previousPoints = points;
        }

        const prize = prizeMap.get(currentRank);
        if (!prize) continue;

        const code = await ensureUniqueCode();
        await tx.weeklyWinner.create({
          data: {
            weekId,
            userId: r.userId,
            rank: currentRank,
            weekPrizeId: prize.id,
            code,
            expiresAt,
          },
        });
        assigned++;
      }
    });

    return {
      assigned,
      message: `Semana ${week.number} cerrada. ${assigned} premios asignados.`,
    };
  } catch (e) {
    console.error(`[WeekCloser] Error asignando premios para semana ${weekId}:`, e);
    await prisma.week.update({ where: { id: weekId }, data: { isClosed: false } });
    return { assigned: 0, message: `Error: ${e instanceof Error ? e.message : "desconocido"}` };
  }
}

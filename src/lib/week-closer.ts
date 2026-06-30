import { prisma } from "./prisma";
import { todayColombia } from "./colombia-time";

function generateFACode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `FA${digits}`;
}

async function ensureUniqueCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateFACode();
    const existing = await prisma.weeklyWinner.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return `FA${Date.now().toString().slice(-4)}`;
}

export async function closeWeekAndAssignPrizes(weekId: string) {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: { prizes: true },
  });
  if (!week || week.isClosed) return { assigned: 0, message: "Ya cerrada" };

  const rankings = await prisma.prediction.groupBy({
    by: ["userId"],
    where: { match: { weekId } },
    _sum: { totalPoints: true },
    orderBy: { _sum: { totalPoints: "desc" } },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: rankings.map((r) => r.userId) } },
  });
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const prizeMap = new Map(week.prizes.map((p) => [p.rank, p]));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  let assigned = 0;
  let currentRank = 0;
  let previousPoints: number | null = null;

  for (const r of rankings) {
    const points = r._sum.totalPoints || 0;
    if (points !== previousPoints) {
      currentRank++;
      previousPoints = points;
    }

    const prize = prizeMap.get(currentRank);
    if (!prize) continue;

    const code = await ensureUniqueCode();
    await prisma.weeklyWinner.create({
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

  await prisma.week.update({ where: { id: weekId }, data: { isClosed: true } });

  return {
    assigned,
    message: `Semana ${week.number} cerrada. ${assigned} premios asignados.`,
  };
}

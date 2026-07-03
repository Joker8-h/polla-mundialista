import { NextRequest } from "next/server";
import { syncLiveMatchesIfNecessary } from "@/lib/bzzoiro";
import { prisma } from "@/lib/prisma";
import { getUserIdFromReq } from "@/lib/auth";
import { toColombiaDate } from "@/lib/colombia-time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const weekId = req.nextUrl.searchParams.get("weekId");
  if (!weekId) {
    return new Response("weekId required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          await syncLiveMatchesIfNecessary();

          const week = await prisma.week.findUnique({ where: { id: weekId } });
          if (!week) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ week: null, matches: [], rankings: [], paidDays: [] })}\n\n`));
            return;
          }

          const [matches, rankings] = await Promise.all([
            prisma.match.findMany({
              where: { matchDate: { gte: week.startDate, lte: week.endDate } },
              orderBy: { matchDate: "asc" },
            }),
            prisma.prediction.groupBy({
              by: ["userId"],
              where: { match: { weekId } },
              _sum: { totalPoints: true },
              orderBy: { _sum: { totalPoints: "desc" } },
              take: 50,
            }),
          ]);

          const users = await prisma.user.findMany({
            where: { id: { in: rankings.map((r) => r.userId) } },
          });
          const userMap = new Map(users.map((u) => [u.id, u]));

          let currentRank = 0;
          let previousPoints: number | null = null;
          const rankingResult: { rank: number; userId: string; name: string; city: string | null; points: number }[] = [];

          for (const r of rankings) {
            const points = r._sum.totalPoints || 0;
            if (points !== previousPoints) {
              currentRank = rankingResult.length + 1;
              previousPoints = points;
            }
            rankingResult.push({
              rank: currentRank,
              userId: r.userId,
              name: userMap.get(r.userId)?.name || "Desconocido",
              city: userMap.get(r.userId)?.city || null,
              points,
            });
          }

          const userId = await getUserIdFromReq(req);
          let paidDays: string[] = [];
          if (userId) {
            const dayPasses = await prisma.dayPass.findMany({
              where: {
                userId,
                date: { gte: week.startDate, lte: week.endDate },
              },
              select: { date: true },
            });
            paidDays = [...new Set(dayPasses.map((dp) => toColombiaDate(dp.date)))];
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                week,
                matches,
                rankings: rankingResult,
                paidDays,
              })}\n\n`
            )
          );
        } catch {
          // Don't close stream on error
        }
      };

      let sending = false;
      const safeSend = async () => {
        if (sending) return;
        sending = true;
        try { await send(); } finally { sending = false; }
      };

      await safeSend();
      const interval = setInterval(safeSend, 5000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}

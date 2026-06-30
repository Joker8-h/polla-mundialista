import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromReq } from "@/lib/auth";
import { syncLiveMatchesIfNecessary } from "@/lib/bzzoiro";
import { todayColombia, toColombiaDate } from "@/lib/colombia-time";

export const dynamic = "force-dynamic";

function isValidTeam(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return false;
  if (n.includes("/")) return false;
  if (/^[WL]\d+$/i.test(n)) return false;
  if (/^(Winner|Loser|Runner-up|Runner.up)\s+(Match|Group)\s+\w+$/i.test(n)) return false;
  if (/^\d[A-Z]$/i.test(n)) return false;
  if (/^[A-Z]\d$/i.test(n)) return false;
  if (/^[A-Z0-9]{1,3}$/i.test(n)) return false;
  return true;
}

const TEAM_ALIASES: Record<string, string> = {
  "côte d'ivoire": "ivory coast",
  "cape verde": "cabo verde",
  "cabo verde": "cabo verde",
  "dr congo": "democratic republic of the congo",
  "democratic republic of the congo": "democratic republic of the congo",
  "ivory coast": "ivory coast",
  "curaçao": "curacao",
  "runner-up group a": "",
  "runner-up group b": "",
  "winner group a": "",
  "winner group b": "",
};

function normalizeTeam(name: string): string {
  const n = name.trim().toLowerCase();
  return TEAM_ALIASES[n] || n;
}

function matchDateKey(m: { matchDate: Date }): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(m.matchDate);
}

function hasStats(m: { homeScore: number | null; totalShots: number | null }): boolean {
  return (m.totalShots ?? 0) > 0 || (m.homeScore ?? -1) >= 0;
}

function deduplicateMatches(matches: Array<{ homeTeam: string; awayTeam: string; matchDate: Date; id: string; homeScore: number | null; totalShots: number | null }>): typeof matches {
  const seen = new Map<string, typeof matches[number]>();
  for (const m of matches) {
    const normA = normalizeTeam(m.homeTeam);
    const normB = normalizeTeam(m.awayTeam);
    if (!normA || !normB) continue;
    const key = `${matchDateKey(m)}|${[normA, normB].sort().join("|")}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, m);
    } else if (!hasStats(existing) && hasStats(m)) {
      seen.set(key, m);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.matchDate.getTime() - b.matchDate.getTime());
}

export async function GET(req: NextRequest) {
  await syncLiveMatchesIfNecessary();

  const [y, m, d] = todayColombia().split("-").map(Number);
  const startDate = new Date(Date.UTC(y, m - 1, d - 2, 5, 0, 0, 0));
  const endDate = new Date(Date.UTC(y, m - 1, d + 11, 4, 59, 59, 999));

  const allMatches = await prisma.match.findMany({
    where: {
      matchDate: { gte: startDate, lte: endDate },
    },
    orderBy: { matchDate: "asc" },
  });

  const validMatches = allMatches.filter(
    (m) => isValidTeam(m.homeTeam) && isValidTeam(m.awayTeam)
  );

  const matches = deduplicateMatches(validMatches);

  let paidDays: string[] = [];
  try {
    const userId = await getUserIdFromReq(req);
    if (userId) {
      const dayPasses = await prisma.dayPass.findMany({
        where: { userId },
      });
      paidDays = dayPasses.map((dp) => toColombiaDate(dp.date));
    }
  } catch (e) {
    console.error("Error fetching day passes:", e);
  }

  return NextResponse.json({ matches, paidDays });
}

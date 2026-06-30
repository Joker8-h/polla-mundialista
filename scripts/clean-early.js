const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const cupStart = new Date("2026-06-11T00:00:00.000Z");

  const earlyMatches = await p.match.findMany({
    where: { matchDate: { lt: cupStart } },
    select: { id: true, homeTeam: true, awayTeam: true, matchDate: true, apiMatchId: true },
  });

  console.log(`Matches before June 11: ${earlyMatches.length}`);
  for (const m of earlyMatches) {
    console.log(`  ${m.homeTeam} vs ${m.awayTeam} (${m.matchDate.toISOString()}) api=${m.apiMatchId}`);
  }

  if (earlyMatches.length > 0) {
    const ids = earlyMatches.map(m => m.id);
    const predDel = await p.prediction.deleteMany({ where: { matchId: { in: ids } } });
    console.log(`Deleted ${predDel.count} predictions`);
    const matchDel = await p.match.deleteMany({ where: { id: { in: ids } } });
    console.log(`Deleted ${matchDel.count} matches`);
  }

  const remaining = await p.match.count();
  console.log(`Remaining: ${remaining}`);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });

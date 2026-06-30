const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const teamMap = {
  "Côte d'Ivoire": "Ivory Coast",
  "Türkiye": "Turkey",
  "Curaçao": "Curacao",
  "TǬrkiye": "Turkey",
  "Cabo Verde": "Cape Verde",
  "DR Congo": "Democratic Republic of the Congo",
};

function normalize(t) {
  return (teamMap[t] || t).toLowerCase().replace(/[^a-z]/g, "");
}

(async () => {
  const allMatches = await p.match.findMany({
    orderBy: { matchDate: "asc" },
    select: { id: true, apiMatchId: true, homeTeam: true, awayTeam: true, matchDate: true, status: true },
  });

  console.log(`Total: ${allMatches.length}`);

  const byNameDate = new Map();
  for (const m of allMatches) {
    const dateKey = m.matchDate.toISOString().split("T")[0];
    const teamKey = `${normalize(m.homeTeam)}|${normalize(m.awayTeam)}|${dateKey}`;
    if (!byNameDate.has(teamKey)) byNameDate.set(teamKey, []);
    byNameDate.get(teamKey).push(m);
  }

  const toDelete = [];
  let dupGroups = 0;
  for (const [key, matches] of byNameDate) {
    if (matches.length > 1) {
      dupGroups++;
      const bzzoiro = matches.filter(m => m.apiMatchId > 8000);
      const worldcup = matches.filter(m => m.apiMatchId <= 104);
      const others = matches.filter(m => m.apiMatchId > 104 && m.apiMatchId <= 8000);

      if (worldcup.length > 0) {
        for (const m of matches) {
          if (m.apiMatchId > 104) toDelete.push(m.id);
        }
      } else if (bzzoiro.length > 1) {
        for (let i = 1; i < bzzoiro.length; i++) toDelete.push(bzzoiro[i].id);
      } else {
        for (let i = 1; i < matches.length; i++) toDelete.push(matches[i].id);
      }
    }
  }

  console.log(`Duplicate groups: ${dupGroups}, to delete: ${toDelete.length}`);

  if (toDelete.length > 0) {
    const predDel = await p.prediction.deleteMany({ where: { matchId: { in: toDelete } } });
    console.log(`Deleted ${predDel.count} predictions`);
    const matchDel = await p.match.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`Deleted ${matchDel.count} matches`);
  }

  const remaining = await p.match.count();
  console.log(`Remaining: ${remaining}`);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });

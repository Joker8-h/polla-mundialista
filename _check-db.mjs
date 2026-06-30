import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const weeks = await p.week.findMany({ orderBy: { number: "desc" } });
console.log("=== WEEKS ===");
for (const w of weeks) {
  const cnt = await p.match.count({ where: { weekId: w.id } });
  console.log("Week", w.number, "active:", w.isActive, "closed:", w.isClosed, "matches:", cnt, "range:", w.startDate.toISOString().slice(0,10), "to", w.endDate.toISOString().slice(0,10));
}
console.log("\n=== CURRENT ACTIVE WEEK ===");
const active = await p.week.findFirst({ where: { isActive: true, isClosed: false } });
if (active) {
  const cnt = await p.match.count({ where: { weekId: active.id } });
  const d = await p.match.findMany({ where: { weekId: active.id }, orderBy: { matchDate: "asc" }, select: { matchDate: true, homeTeam: true, awayTeam: true } });
  console.log("Active week:", active.number, "matches:", cnt);
  if (d.length > 0) console.log("  First:", d[0].matchDate.toISOString(), "Last:", d[d.length-1].matchDate.toISOString());
  else console.log("  NO MATCHES");
}
console.log("\n=== MATCH BY DATE ===");
const all = await p.match.findMany({ orderBy: { matchDate: "asc" }, select: { matchDate: true, homeTeam: true, awayTeam: true, weekId: true } });
for (const m of all) {
  const wk = weeks.find(w => w.id === m.weekId);
  console.log(m.matchDate.toISOString().slice(0,10), m.homeTeam, "vs", m.awayTeam, "-> week", wk ? wk.number : "?");
}
await p.$disconnect();

import { prisma } from "../src/lib/prisma";
import { toColombiaDate, getWeekForColombiaDate } from "../src/lib/colombia-time";

async function main() {
  console.log("=== INICIANDO CORRECCIÓN DE SEMANAS ===");

  // 1. Remove duplicate empty weeks (weeks with 0 matches, keep only week 1)
  const weeks = await prisma.week.findMany({ orderBy: { number: "asc" } });
  console.log(`\nSemanas encontradas: ${weeks.length}`);
  for (const w of weeks) {
    const cnt = await prisma.match.count({ where: { weekId: w.id } });
    console.log(`  Semana ${w.number}: ${cnt} partidos, activa=${w.isActive}, cerrada=${w.isClosed}`);
  }

  // 2. Reassign all matches to correct weeks
  const allMatches = await prisma.match.findMany({ orderBy: { matchDate: "asc" } });
  console.log(`\nReasignando ${allMatches.length} partidos...`);

  let reassigned = 0;
  for (const match of allMatches) {
    const colDate = toColombiaDate(match.matchDate);
    const { startDate, endDate } = getWeekForColombiaDate(colDate);

    let week = await prisma.week.findFirst({
      where: { startDate, endDate },
    });

    if (!week) {
      const lastWeek = await prisma.week.findFirst({ orderBy: { number: "desc" } });
      week = await prisma.week.create({
        data: {
          number: (lastWeek?.number || 0) + 1,
          startDate,
          endDate,
        },
      });
      console.log(`  Semana ${week.number} creada para ${colDate}`);
    }

    if (match.weekId !== week.id) {
      await prisma.match.update({
        where: { id: match.id },
        data: { weekId: week.id },
      });
      reassigned++;
    }
  }
  console.log(`\n${reassigned} partidos reasignados a sus semanas correctas`);

  // 3. Close empty duplicate weeks
  const allWeeks = await prisma.week.findMany({ orderBy: { number: "asc" } });
  const weeksWithMatches = new Set<string>();
  const matches = await prisma.match.findMany({ select: { weekId: true } });
  for (const m of matches) weeksWithMatches.add(m.weekId);

  let closed = 0;
  for (const w of allWeeks) {
    if (!weeksWithMatches.has(w.id) && !w.isClosed) {
      console.log(`  Cerrando semana vacía ${w.number}`);
      await prisma.week.update({ where: { id: w.id }, data: { isClosed: true } });
      closed++;
    }
  }
  console.log(`${closed} semanas vacías cerradas`);

  // 4. Show final state
  console.log("\n=== ESTADO FINAL ===");
  const finalWeeks = await prisma.week.findMany({ orderBy: { number: "asc" } });
  for (const w of finalWeeks) {
    const cnt = await prisma.match.count({ where: { weekId: w.id } });
    console.log(`  Semana ${w.number}: ${cnt} partidos, activa=${w.isActive}, cerrada=${w.isClosed}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});

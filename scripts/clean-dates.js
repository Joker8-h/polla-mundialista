const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const badBefore = await p.match.deleteMany({
    where: { matchDate: { lt: new Date("2026-06-01") } },
  });
  console.log("Deleted matches before Jun 2026:", badBefore.count);

  const badAfter = await p.match.deleteMany({
    where: { matchDate: { gt: new Date("2027-01-01") } },
  });
  console.log("Deleted matches after 2026:", badAfter.count);

  const remaining = await p.match.count();
  console.log("Remaining matches:", remaining);

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

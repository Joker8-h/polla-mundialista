const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  await p.playerGoalPrediction.deleteMany();
  await p.prediction.deleteMany();
  await p.match.deleteMany();
  await p.weeklyWinner.deleteMany();
  await p.week.deleteMany();
  console.log('Base de datos limpiada!');
}

main()
  .then(() => p.$disconnect())
  .catch(e => { console.error(e); p.$disconnect(); process.exit(1); });

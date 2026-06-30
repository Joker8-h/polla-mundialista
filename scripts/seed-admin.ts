import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminWhatsapp = process.env.ADMIN_WHATSAPP;

  if (adminWhatsapp) {
    const user = await prisma.user.findUnique({ where: { whatsapp: adminWhatsapp } });
    if (user && !user.isAdmin) {
      await prisma.user.update({ where: { whatsapp: adminWhatsapp }, data: { isAdmin: true } });
      console.log(`[Seed] Usuario ${adminWhatsapp} promovido a admin.`);
    }
    return;
  }

  const anyAdmin = await prisma.user.findFirst({ where: { isAdmin: true } });
  if (anyAdmin) return;

  const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (firstUser) {
    await prisma.user.update({ where: { id: firstUser.id }, data: { isAdmin: true } });
    console.log(`[Seed] Primer usuario ${firstUser.whatsapp} promovido a admin automáticamente.`);
  }
}

main()
  .catch((e) => { console.error("[Seed] Error:", e); })
  .finally(() => prisma.$disconnect());

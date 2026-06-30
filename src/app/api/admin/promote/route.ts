import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const { whatsapp, adminPassword } = body;

  if (adminPassword !== (process.env.ADMIN_PASSWORD || "admin2026")) {
    return NextResponse.json({ error: "Contraseña de admin incorrecta" }, { status: 401 });
  }

  if (!whatsapp) {
    return NextResponse.json({ error: "WhatsApp requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { whatsapp } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado. Regístrate primero." }, { status: 404 });
  }

  if (user.isAdmin) {
    return NextResponse.json({ message: "Ya eres admin", ok: true });
  }

  await prisma.user.update({
    where: { whatsapp },
    data: { isAdmin: true },
  });

  return NextResponse.json({ message: "Ahora eres admin. Ve a /admin", ok: true });
}
